export type Vec2 = [number, number]
export type Vec3 = [number, number, number]

export interface VenueSummary {
  id: string
  name: string
  thumbnail: string
}

export interface Poi {
  id: string
  name: string
  category: string
  tags?: string[]
  /** Floor position [x, z] in world space, the same frame as walkable and obstacles */
  position: Vec2
  /** Optional outline [x, z] of the room or zone this POI names */
  zone?: Vec2[]
  /** Height of the pin above the floor, defaults to 1.2 */
  pinHeight?: number
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
  pois: Poi[]
}