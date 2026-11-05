import { useEffect, useState } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'theme'
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')

const readPreference = (): ThemePreference => {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'system'
}

// index.html applies the stored theme before React loads, to avoid a flash.
// This hook keeps it in sync afterwards, including OS changes in "system" mode.
export function useTheme() {
  const [preference, setPreference] = useState(readPreference)

  useEffect(() => {
    const apply = () => {
      const dark =
        preference === 'dark' || (preference === 'system' && darkQuery.matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    }

    apply()
    if (preference === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, preference)

    darkQuery.addEventListener('change', apply)
    return () => darkQuery.removeEventListener('change', apply)
  }, [preference])

  return [preference, setPreference] as const
}
