export type Vec2 = [number, number]
export type Vec3 = [number, number, number]

export interface VenueSummary {
  id: string
  name: string
  thumbnail: string
}

export interface VenueConfig {
  id: string
  name: string
  modelUrl: string
  rotation: Vec3
  scale: number
  position: Vec3
  floorHeight: number
  startPosition: Vec3
  playerRadius: number
  walkable: Vec2[]
  obstacles: Vec2[][]
}