import { useCallback, useRef, useState } from 'react'

export type Toast = {
  id: number
  kind: 'success' | 'error'
  text: string
}

const TOAST_DURATION_MS = 4500
const MAX_TOASTS = 4

// The fade-out itself is a CSS animation timed to TOAST_DURATION_MS.
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (kind: Toast['kind'], text: string) => {
      const id = ++nextId.current
      setToasts((current) => [
        ...current.slice(-(MAX_TOASTS - 1)),
        { id, kind, text },
      ])
      setTimeout(() => dismiss(id), TOAST_DURATION_MS)
    },
    [dismiss],
  )

  return { toasts, push, dismiss }
}
