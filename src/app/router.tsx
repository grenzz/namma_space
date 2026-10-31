import { createHashRouter, Navigate } from "react-router-dom"

export const router = createHashRouter([
  { path: "/", element: <Navigate to="/rnd_iiitd" replace /> },
  {
    path: "/:venueId",
    lazy: async () => {
      const { default: Component } = await import("@/pages/ViewerPage")
      return { Component }
    },
  },
])