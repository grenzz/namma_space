import type { Vec2 } from "@/features/venues/types"

export interface CollisionMap {
  walkable: Vec2[]
  obstacles: Vec2[][]
  radius: number
}

function pointInPolygon(x: number, z: number, poly: Vec2[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i]
    const [xj, zj] = poly[j]
    const crosses =
      zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi
    if (crosses) inside = !inside
  }
  return inside
}

function closestOnPolygon(x: number, z: number, poly: Vec2[]) {
  let best = { x: 0, z: 0, dist: Infinity }
  for (let i = 0; i < poly.length; i++) {
    const [ax, az] = poly[i]
    const [bx, bz] = poly[(i + 1) % poly.length]
    const abx = bx - ax
    const abz = bz - az
    const lenSq = abx * abx + abz * abz
    let t = lenSq === 0 ? 0 : ((x - ax) * abx + (z - az) * abz) / lenSq
    t = Math.max(0, Math.min(1, t))
    const cx = ax + abx * t
    const cz = az + abz * t
    const dist = Math.hypot(x - cx, z - cz)
    if (dist < best.dist) best = { x: cx, z: cz, dist }
  }
  return best
}

function keepInside(p: Vec2, poly: Vec2[], r: number): Vec2 {
  const inside = pointInPolygon(p[0], p[1], poly)
  const c = closestOnPolygon(p[0], p[1], poly)
  if (inside && c.dist >= r) return p

  let dx = inside ? p[0] - c.x : c.x - p[0]
  let dz = inside ? p[1] - c.z : c.z - p[1]
  const len = Math.hypot(dx, dz)
  if (len < 1e-6) return p
  dx /= len
  dz /= len
  return [c.x + dx * r, c.z + dz * r]
}

function keepOutside(p: Vec2, poly: Vec2[], r: number): Vec2 {
  const inside = pointInPolygon(p[0], p[1], poly)
  const c = closestOnPolygon(p[0], p[1], poly)
  if (!inside && c.dist >= r) return p

  let dx = inside ? c.x - p[0] : p[0] - c.x
  let dz = inside ? c.z - p[1] : p[1] - c.z
  const len = Math.hypot(dx, dz)
  if (len < 1e-6) return p
  dx /= len
  dz /= len
  return [c.x + dx * r, c.z + dz * r]
}

export function resolveCollision(
  map: CollisionMap,
  x: number,
  z: number,
  prevX: number,
  prevZ: number,
): Vec2 {
  if (map.walkable.length < 3) return [x, z]

  let p: Vec2 = [x, z]
  for (let i = 0; i < 3; i++) {
    p = keepInside(p, map.walkable, map.radius)
    for (const obstacle of map.obstacles) {
      if (obstacle.length >= 3) p = keepOutside(p, obstacle, map.radius)
    }
  }

  const valid =
    pointInPolygon(p[0], p[1], map.walkable) &&
    map.obstacles.every(
      (o) => o.length < 3 || !pointInPolygon(p[0], p[1], o),
    )
  return valid ? p : [prevX, prevZ]
}