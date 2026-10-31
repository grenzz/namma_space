import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"

const rows: { keys: string[]; label: string }[] = [
  { keys: ["W", "A", "S", "D"], label: "Move" },
  { keys: ["Mouse"], label: "Look around" },
  { keys: ["Shift"], label: "Sprint" },
  { keys: ["Esc"], label: "Release cursor" },
]

export default function ControlsHint() {
  const [locked, setLocked] = useState(false)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const onChange = () => {
      const isLocked = document.pointerLockElement !== null
      setLocked(isLocked)
      if (isLocked) setStarted(true)
    }
    document.addEventListener("pointerlockchange", onChange)
    return () => document.removeEventListener("pointerlockchange", onChange)
  }, [])

  return (
    <AnimatePresence>
      {!locked && (
        <motion.div
          key="hint"
          className="pointer-events-none absolute inset-0 z-20 grid place-items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(3,10,10,.15) 0%, rgba(3,10,10,.65) 100%)",
            }}
          />

          <motion.div
            className="nm-glass w-[320px] px-7 py-6 text-center"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="nm-label" style={{ color: "var(--nm-accent)" }}>
              {started ? "Paused" : "Ready"}
            </p>
            <h2 className="mt-2 text-[22px] font-semibold tracking-tight">
              {started ? (
                <>
                  Click to <span style={{ color: "var(--nm-accent)" }}>resume</span>
                </>
              ) : (
                <>
                  Click to{" "}
                  <span style={{ color: "var(--nm-accent)" }}>start exploring</span>
                </>
              )}
            </h2>

            <div className="my-5 h-px bg-gradient-to-r from-transparent via-[var(--nm-border)] to-transparent" />

            <ul className="space-y-3 text-left">
              {rows.map((r) => (
                <li key={r.label} className="flex items-center justify-between">
                  <span className="flex gap-1">
                    {r.keys.map((k) => (
                      <kbd key={k} className="nm-kbd">
                        {k}
                      </kbd>
                    ))}
                  </span>
                  <span className="text-[12px]" style={{ color: "var(--nm-muted)" }}>
                    {r.label}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}