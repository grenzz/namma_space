import * as THREE from "three"

export function createRecorder(camera: THREE.PerspectiveCamera) {
  const points: [number, number][] = []

  const onKey = (e: KeyboardEvent) => {
    if (e.code === "KeyC") {
      points.push([
        Number(camera.position.x.toFixed(2)),
        Number(camera.position.z.toFixed(2)),
      ])
      console.log(`Point ${points.length} recorded`)
    }
    if (e.code === "KeyX") {
      points.pop()
      console.log(`Last point removed, ${points.length} left`)
    }
    if (e.code === "KeyV") {
      console.log(JSON.stringify(points))
      points.length = 0
    }
  }

  window.addEventListener("keydown", onKey)
  return () => window.removeEventListener("keydown", onKey)
}