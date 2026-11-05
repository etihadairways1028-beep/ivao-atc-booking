import { useState } from 'react'

const STORAGE_KEY = 'vid'

// Remembers the VID between visits so users don't have to type it each time.
export function useVid() {
  const [vid, setVid] = useState(() => localStorage.getItem(STORAGE_KEY) ?? '')

  const update = (value: string) => {
    if (value) localStorage.setItem(STORAGE_KEY, value)
    else localStorage.removeItem(STORAGE_KEY)
    setVid(value)
  }

  return [vid, update] as const
}
