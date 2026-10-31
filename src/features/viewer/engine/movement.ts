import * as THREE from "three"
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js"
import type { Vec3 } from "@/features/venues/types"
import { resolveCollision, type CollisionMap } from "./collision"

interface Options {
  start: Vec3
  floorHeight: number
  eyeHeight: number
  collision?: CollisionMap
}

const WALK_SPEED = 2.5
const SPRINT_SPEED = 5
const SMOOTHING = 10

export function createMovement(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement,
  options: Options,
) {
  const controls = new PointerLockControls(camera, domElement)
  const keys = new Set<string>()
  const velocity = new THREE.Vector2()
  const target = new THREE.Vector2()

  camera.position.set(
    options.start[0],
    options.floorHeight + options.eyeHeight,
    options.start[2],
  )

  const onKeyDown = (e: KeyboardEvent) => {
    keys.add(e.code)
    if (e.code === "KeyP") {
      const p = camera.position
      console.log(`"startPosition": [${p.x.toFixed(2)}, 0, ${p.z.toFixed(2)}]`)
    }
  }
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code)
  const onBlur = () => keys.clear()
  const onClick = () => {
    if (!controls.isLocked) controls.lock()
  }

  window.addEventListener("keydown", onKeyDown)
  window.addEventListener("keyup", onKeyUp)
  window.addEventListener("blur", onBlur)
  domElement.addEventListener("click", onClick)

  function update(dt: number) {
    if (!controls.isLocked) {
      velocity.set(0, 0)
      return
    }

    target.set(
      (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0),
      (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0),
    )
    if (target.lengthSq() > 0) target.normalize()

    const sprint = keys.has("ShiftLeft") || keys.has("ShiftRight")
    target.multiplyScalar(sprint ? SPRINT_SPEED : WALK_SPEED)

    velocity.lerp(target, 1 - Math.exp(-SMOOTHING * dt))

    const prevX = camera.position.x
    const prevZ = camera.position.z
    controls.moveRight(velocity.x * dt)
    controls.moveForward(velocity.y * dt)

    if (options.collision) {
      const [nx, nz] = resolveCollision(
        options.collision,
        camera.position.x,
        camera.position.z,
        prevX,
        prevZ,
      )
      camera.position.x = nx
      camera.position.z = nz
    }
    camera.position.y = options.floorHeight + options.eyeHeight
  }

  function dispose() {
    window.removeEventListener("keydown", onKeyDown)
    window.removeEventListener("keyup", onKeyUp)
    window.removeEventListener("blur", onBlur)
    domElement.removeEventListener("click", onClick)
    controls.dispose()
  }

  return { controls, update, dispose }
}