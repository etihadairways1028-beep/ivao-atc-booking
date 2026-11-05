import { useEffect, useState } from 'react'

// Current time, refreshed every `intervalMs`. Keeps render functions pure.
export function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])

  return now
}
