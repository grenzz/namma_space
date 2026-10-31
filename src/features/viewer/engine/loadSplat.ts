import * as THREE from "three"
import { SplatMesh } from "@sparkjsdev/spark"
import type { VenueConfig } from "@/features/venues/types"
import { assetUrl } from "@/lib/assetUrl";

export async function loadSplat(
  scene: THREE.Scene,
  config: VenueConfig,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal,
) {
  const res = await fetch(assetUrl( config.modelUrl), { signal })
  if (!res.ok || !res.body) throw new Error("Model download failed")

  const total = Number(res.headers.get("Content-Length")) || 0
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.length
    if (total) onProgress?.(Math.min(received / total, 0.95))
  }

  const bytes = new Uint8Array(received)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.length
  }

  const splat = new SplatMesh({ fileBytes: bytes, fileName: config.modelUrl })
  splat.rotation.order = "YXZ"
  const [rx, ry, rz] = config.rotation.map(THREE.MathUtils.degToRad)
  splat.rotation.set(rx, ry, rz)
  splat.position.set(config.position[0], config.position[1], config.position[2])
  splat.scale.setScalar(config.scale)
  scene.add(splat)

  await splat.initialized
  onProgress?.(1)
  return splat
}