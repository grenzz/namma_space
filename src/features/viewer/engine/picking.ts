import * as THREE from "three"
import type { Poi, Vec2 } from "@/features/venues/types"
import { pointInPolygon } from "./collision"

const DEFAULT_PIN_HEIGHT = 1.2
// How close to the crosshair a pin must be, in NDC units where the screen height is 2
const PIN_PICK_RADIUS = 0.12

const raycaster = new THREE.Raycaster()
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const hit = new THREE.Vector3()
const ndcPoint = new THREE.Vector2()
const pinPoint = new THREE.Vector3()

export function pinWorldPosition(poi: Poi, floorY: number, out = new THREE.Vector3()) {
  return out.set(poi.position[0], floorY + (poi.pinHeight ?? DEFAULT_PIN_HEIGHT), poi.position[1])
}

/** Where a screen point hits the floor, as [x, z], or null if it points at the sky */
export function floorPointFromScreen(
  camera: THREE.Camera,
  ndcX: number,
  ndcY: number,
  floorY: number,
): Vec2 | null {
  floorPlane.constant = -floorY
  raycaster.setFromCamera(ndcPoint.set(ndcX, ndcY), camera)
  return raycaster.ray.intersectPlane(floorPlane, hit) ? [hit.x, hit.z] : null
}

function polygonArea(poly: Vec2[]) {
  let sum = 0
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    sum += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1]
  }
  return Math.abs(sum) / 2
}

/** The POI whose zone contains the point, preferring the smallest zone when zones overlap */
export function poiAtFloorPoint(pois: Poi[], point: Vec2): Poi | null {
  let best: Poi | null = null
  let bestArea = Infinity
  for (const poi of pois) {
    if (!poi.zone || poi.zone.length < 3) continue
    if (!pointInPolygon(point[0], point[1], poi.zone)) continue
    const area = polygonArea(poi.zone)
    if (area < bestArea) {
      best = poi
      bestArea = area
    }
  }
  return best
}

/** The pin closest to a screen point, if it is in front of the camera and within the pick radius */
export function poiNearScreenPoint(
  pois: Poi[],
  camera: THREE.Camera,
  ndcX: number,
  ndcY: number,
  floorY: number,
): Poi | null {
  let best: Poi | null = null
  let bestDist = PIN_PICK_RADIUS
  for (const poi of pois) {
    pinWorldPosition(poi, floorY, pinPoint).project(camera)
    if (pinPoint.z < -1 || pinPoint.z > 1) continue
    const d = Math.hypot(pinPoint.x - ndcX, pinPoint.y - ndcY)
    if (d < bestDist) {
      best = poi
      bestDist = d
    }
  }
  return best
}

/** Pin first, then the zone under the same point on the floor */
export function resolvePick(
  pois: Poi[],
  camera: THREE.Camera,
  ndcX: number,
  ndcY: number,
  floorY: number,
): Poi | null {
  const pin = poiNearScreenPoint(pois, camera, ndcX, ndcY, floorY)
  if (pin) return pin
  const floor = floorPointFromScreen(camera, ndcX, ndcY, floorY)
  return floor ? poiAtFloorPoint(pois, floor) : null
}
