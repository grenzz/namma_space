import { useEffect, useState } from "react"
import type { VenueConfig } from "../types"
import { assetUrl } from "@/lib/assetUrl";

type VenueState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; config: VenueConfig }

export function useVenue(venueId?: string): VenueState {
  const [state, setState] = useState<VenueState>({ status: "loading" })

  useEffect(() => {
    if (!venueId) return
    const controller = new AbortController()
    setState({ status: "loading" })

    fetch(assetUrl(`/venues/${venueId}/config.json`, { signal: controller.signal }))
      .then((res) => {
        if (!res.ok) throw new Error("Venue not found")
        return res.json() as Promise<VenueConfig>
      })
      .then((config) => setState({ status: "ready", config }))
      .catch((err: Error) => {
        if (err.name !== "AbortError") {
          setState({ status: "error", message: "Venue not found" })
        }
      })

    return () => controller.abort()
  }, [venueId])

  return state
}