import { create } from "zustand"

interface PoiState {
  selectedId: string | null
  select: (id: string | null) => void
}

export const usePoiStore = create<PoiState>((set) => ({
  selectedId: null,
  select: (selectedId) => set({ selectedId }),
}))
