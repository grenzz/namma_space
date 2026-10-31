import { useEffect, useRef, useState } from "react"
import type { SplatMesh } from "@sparkjsdev/spark"
import { createScene } from "../engine/createScene"
import { loadSplat } from "../engine/loadSplat"
import DebugPanel from "./DebugPanel"
import LoadingScreen from "./LoadingScreen"
import ControlsHint from "./ControlsHint"
import type { VenueConfig } from "@/features/venues/types"

export default function ViewerCanvas({ config }: { config: VenueConfig }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loadedSplat, setLoadedSplat] = useState<SplatMesh | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loaderGone, setLoaderGone] = useState(false)

  useEffect(() => {
    if (!loadedSplat) {
      setLoaderGone(false)
      return
    }

    const timer = window.setTimeout(() => setLoaderGone(true), 700)
    return () => window.clearTimeout(timer)
  }, [loadedSplat])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    let splat: SplatMesh | null = null
    const controller = new AbortController()
    const ctx = createScene(container, config)

    loadSplat(ctx.scene, config, setProgress, controller.signal)
      .then(async (s) => {
        // if (DEBUG_LOADER_DELAY_MS > 0) await sleep(DEBUG_LOADER_DELAY_MS)

        if (cancelled) {
          s.dispose()
          return
        }
        splat = s
        setLoadedSplat(s)
      })
      .catch(() => {
        if (!cancelled) setError("Could not load this model")
      })

    return () => {
      cancelled = true
      controller.abort()
      splat?.dispose()
      setLoadedSplat(null)
      setProgress(0)
      setError(null)
      ctx.dispose()
    }
  }, [config])

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <div ref={containerRef} className="h-full w-full" />

      {!loaderGone && (
        <LoadingScreen
          progress={
            typeof progress === "number" ? progress * 100 : undefined
          }
          status={
            typeof progress === "number"
              ? progress >= 0.95
                ? "PREPARING SCENE"
                : "DOWNLOADING MODEL"
              : undefined
          }
          name={config.name}
          error={error ?? null}
          done={Boolean(loadedSplat)}
          // onRetry={retryLoad}
        />
      )}

      {loadedSplat && loaderGone && <ControlsHint />}

      {import.meta.env.DEV && loadedSplat && (
        <DebugPanel
          splat={loadedSplat}
          initialRotation={config.rotation}
          initialScale={config.scale}
          initialPosition={config.position}
        />
      )}
    </div>
  )
}