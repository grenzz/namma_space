import { create } from "zustand"

interface OverlayState {
  showGrid: boolean
  showFps: boolean
  showZones: boolean
  setShowGrid: (v: boolean) => void
  setShowFps: (v: boolean) => void
  setShowZones: (v: boolean) => void
}

// All default to OFF so end users see a clean scene.
export const useOverlayStore = create<OverlayState>((set) => ({
  showGrid: false,
  showFps: false,
  showZones: false,
  setShowGrid: (showGrid) => set({ showGrid }),
  setShowFps: (showFps) => set({ showFps }),
  setShowZones: (showZones) => set({ showZones }),
}))