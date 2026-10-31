import { useParams } from "react-router-dom"
import { useVenue } from "../features/venues/hooks/useVenues"
import ViewerCanvas from "@/features/viewer/components/ViewerCanvas"

export default function ViewerPage() {
  const { venueId } = useParams()
  const venue = useVenue(venueId)

  if (venue.status === "loading") return <p>Loading</p>
  if (venue.status === "error") return <p>{venue.message}</p>

  return <ViewerCanvas config={venue.config} />
}