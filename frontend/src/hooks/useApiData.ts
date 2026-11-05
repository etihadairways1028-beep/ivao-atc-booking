import { useEffect, useState } from 'react'
import { errorMessage } from '../api'

type Result<T> = {
  key: string
  data?: T
  error?: string
  fetchedAt: string
}

/**
 * Loads data whenever `key` changes (pass null to skip loading).
 * `load` must be memoised with useCallback. The result remembers which key
 * it belongs to, so "loading" is derived instead of being toggled by hand,
 * and a stale response is never shown for a newer request.
 */
export function useApiData<T>(
  key: string | null,
  load: (signal: AbortSignal) => Promise<T>,
) {
  const [result, setResult] = useState<Result<T> | null>(null)

  useEffect(() => {
    if (key === null) return
    const controller = new AbortController()
    const fetchedAt = () => new Date().toISOString()

    load(controller.signal).then(
      (data) => setResult({ key, data, fetchedAt: fetchedAt() }),
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({ key, error: errorMessage(error), fetchedAt: fetchedAt() })
        }
      },
    )

    return () => controller.abort()
  }, [key, load])

  const current = result?.key === key ? result : null
  return {
    data: current?.data,
    error: current?.error,
    // Reference time for "is this booking still editable", fixed per response.
    fetchedAt: current?.fetchedAt ?? '',
    loading: key !== null && !current,
  }
}
