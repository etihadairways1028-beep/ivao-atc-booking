import { useState } from 'react'
import { readStorage, writeStorage } from '../storage'

const STORAGE_KEY = 'vid'

// Remembers the VID between visits so users don't have to type it each time.
export function useVid() {
  const [vid, setVid] = useState(() => readStorage(STORAGE_KEY) ?? '')

  const update = (value: string) => {
    writeStorage(STORAGE_KEY, value || null)
    setVid(value)
  }

  return [vid, update] as const
}
