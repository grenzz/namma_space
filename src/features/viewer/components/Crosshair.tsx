import { useEffect, useState } from "react"

export default function Crosshair() {
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    const onChange = () => setLocked(document.pointerLockElement !== null)
    document.addEventListener("pointerlockchange", onChange)
    return () => document.removeEventListener("pointerlockchange", onChange)
  }, [])

  if (!locked) return null
  return <div className="nm-crosshair" aria-hidden="true" />
}
