import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import type { Poi } from "@/features/venues/types"
import { usePoiStore } from "@/features/viewer/store/poiStore"

export default function PoiCard({ pois }: { pois: Poi[] }) {
  const selectedId = usePoiStore((s) => s.selectedId)
  const select = usePoiStore((s) => s.select)
  const poi = pois.find((p) => p.id === selectedId)

  return (
    <AnimatePresence>
      {poi && (
        <motion.div
          key={poi.id}
          className="nm-glass absolute bottom-6 left-6 z-30 w-72 px-5 py-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="nm-label" style={{ color: "var(--nm-accent)" }}>
                {poi.category}
              </p>
              <h2 className="mt-1 text-[18px] font-semibold tracking-tight">{poi.name}</h2>
            </div>
            <button type="button" onClick={() => select(null)} aria-label="Close">
              <X size={14} color="var(--nm-muted)" />
            </button>
          </div>

          {poi.tags && poi.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {poi.tags.map((tag) => (
                <span key={tag} className="nm-tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
