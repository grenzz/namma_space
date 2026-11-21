import * as THREE from "three"
import type { VenueConfig } from "@/features/venues/types"
import { usePoiStore } from "@/features/viewer/store/poiStore"
import { pinWorldPosition, resolvePick } from "./picking"

// Pins farther than this from the camera are hidden, since the splat has no depth to hide them behind walls
const MAX_PIN_DISTANCE = 12

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
}

export function createPoiLayer(
  container: HTMLElement,
  camera: THREE.PerspectiveCamera,
  config: VenueConfig,
) {
  const pois = config.pois ?? []
  const { select } = usePoiStore.getState()

  const root = document.createElement("div")
  root.className = "nm-poi-layer"
  container.appendChild(root)

  const pins = pois.map((poi) => {
    const el = document.createElement("button")
    el.type = "button"
    el.className = "nm-poi"
    el.setAttribute("aria-label", poi.name)

    const dot = document.createElement("span")
    dot.className = "nm-poi-dot"
    const label = document.createElement("span")
    label.className = "nm-poi-label"
    label.textContent = poi.name
    el.append(dot, label)

    el.addEventListener("click", (e) => {
      e.stopPropagation()
      select(poi.id)
    })
    root.appendChild(el)
    return { poi, el }
  })

  const world = new THREE.Vector3()
  const screen = new THREE.Vector3()

  const syncSelection = (state: { selectedId: string | null }) => {
    for (const { poi, el } of pins) el.dataset.selected = String(poi.id === state.selectedId)
  }
  syncSelection(usePoiStore.getState())
  const unsubscribe = usePoiStore.subscribe(syncSelection)

  // While the cursor is captured, E inspects whatever sits under the crosshair
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code !== "KeyE" || e.repeat || isTyping(e.target)) return
    if (document.pointerLockElement === null) return
    const found = resolvePick(pois, camera, 0, 0, config.floorHeight)
    select(found ? found.id : null)
  }
  window.addEventListener("keydown", onKeyDown)

  function update() {
    const width = container.clientWidth
    const height = container.clientHeight
    const selectedId = usePoiStore.getState().selectedId

    for (const { poi, el } of pins) {
      pinWorldPosition(poi, config.floorHeight, world)
      const distance = camera.position.distanceTo(world)
      screen.copy(world).project(camera)

      const inFront = screen.z > -1 && screen.z < 1
      const near = distance <= MAX_PIN_DISTANCE || poi.id === selectedId
      if (!inFront || !near) {
        el.style.display = "none"
        continue
      }

      el.style.display = ""
      const x = (screen.x * 0.5 + 0.5) * width
      const y = (-screen.y * 0.5 + 0.5) * height
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`
    }
  }

  function dispose() {
    window.removeEventListener("keydown", onKeyDown)
    unsubscribe()
    root.remove()
    select(null)
  }

  return { update, dispose }
}
