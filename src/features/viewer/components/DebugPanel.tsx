import { useState } from "react"
import * as THREE from "three"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronDown, Copy, Check } from "lucide-react"
import type { SplatMesh } from "@sparkjsdev/spark"
import type { Vec3 } from "@/features/venues/types"
import { useOverlayStore } from "@/features/viewer/store/overlayStore"

interface Props {
  splat: SplatMesh
  initialRotation: Vec3
  initialScale: number
  initialPosition: Vec3
}

const rad = THREE.MathUtils.degToRad

function Slider({
  label,
  display,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  display: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  const p = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="nm-label">{label}</span>
        <span className="nm-value">{display}</span>
      </div>
      <input
        type="range"
        className="nm-range"
        style={{ ["--p" as string]: `${p}%` }}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between"
    >
      <span className="nm-label">{label}</span>
      <span className="nm-switch" data-on={checked} />
    </button>
  )
}

export default function DebugPanel({
  splat,
  initialRotation,
  initialScale,
  initialPosition,
}: Props) {
  const [rot, setRot] = useState<Vec3>(initialRotation)
  const [scale, setScale] = useState(initialScale)
  const [posY, setPosY] = useState(initialPosition[1])
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const { showGrid, showFps, showZones, setShowGrid, setShowFps, setShowZones } =
    useOverlayStore()

  const updateRot = (i: number, value: number) => {
    const next = [...rot] as Vec3
    next[i] = value
    setRot(next)
    splat.rotation.set(rad(next[0]), rad(next[1]), rad(next[2]))
  }

  const updateScale = (value: number) => {
    if (value <= 0) return
    const nextY = (posY / scale) * value
    setScale(value)
    setPosY(nextY)
    splat.scale.setScalar(value)
    splat.position.y = nextY
  }

  const updatePosY = (value: number) => {
    setPosY(value)
    splat.position.y = value
  }

  const json = `"rotation": [${rot.join(", ")}],\n"scale": ${scale},\n"position": [${initialPosition[0]}, ${posY}, ${initialPosition[2]}],`

  const copy = async () => {
    await navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <div className="nm-glass absolute right-4 top-4 z-30 w-72 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <span className="nm-label" style={{ color: "var(--nm-accent)" }}>
          Settings
        </span>
        <motion.span
          animate={{ rotate: open ? 0 : -90 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={14} color="var(--nm-muted)" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className="space-y-4 border-t px-4 pb-4 pt-4"
              style={{ borderColor: "var(--nm-border)" }}
            >
              {/* Visible to everyone */}
              <div className="space-y-3">
                <Toggle label="Grid" checked={showGrid} onChange={setShowGrid} />
                <Toggle label="FPS counter" checked={showFps} onChange={setShowFps} />
                <Toggle label="Walkable zones" checked={showZones} onChange={setShowZones} />
              </div>

              {/* Dev only: stripped from the production UI */}
              {import.meta.env.DEV && (
                <>
                  <div
                    className="space-y-4 border-t pt-4"
                    style={{ borderColor: "var(--nm-border)" }}
                  >
                    {["X", "Y", "Z"].map((axis, i) => (
                      <Slider
                        key={axis}
                        label={`Rotation ${axis}`}
                        display={rot[i].toFixed(1)}
                        value={rot[i]}
                        min={-360}
                        max={360}
                        step={0.25}
                        onChange={(v) => updateRot(i, v)}
                      />
                    ))}

                    <Slider
                      label="Height"
                      display={posY.toFixed(2)}
                      value={posY}
                      min={-20}
                      max={20}
                      step={0.01}
                      onChange={updatePosY}
                    />

                    <div>
                      <span className="nm-label mb-2 block">Scale</span>
                      <input
                        type="number"
                        step={0.01}
                        className="nm-input"
                        value={scale}
                        onChange={(e) => updateScale(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div
                    className="relative rounded-lg p-3"
                    style={{
                      background: "rgba(0,0,0,.35)",
                      border: "1px solid var(--nm-border)",
                    }}
                  >
                    <pre
                      className="select-all whitespace-pre-wrap pr-6 font-mono text-[10.5px] leading-relaxed"
                      style={{ color: "var(--nm-muted)" }}
                    >
                      {json}
                    </pre>
                    <button
                      onClick={copy}
                      className="absolute right-2 top-2"
                      aria-label="Copy JSON"
                    >
                      {copied ? (
                        <Check size={13} color="var(--nm-accent)" />
                      ) : (
                        <Copy size={13} color="var(--nm-muted)" />
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}