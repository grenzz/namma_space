import * as THREE from "three"
import type { Vec2 } from "@/features/venues/types"

export function createPolygonLine(points: Vec2[], y: number, color: number) {
  const vertices = points.map(([x, z]) => new THREE.Vector3(x, y + 0.02, z))
  const geometry = new THREE.BufferGeometry().setFromPoints(vertices)
  return new THREE.LineLoop(geometry, new THREE.LineBasicMaterial({ color }))
}