import { useCallback, useEffect, useState } from 'react'

/** Load async data with a reload trigger. Minimal, no external deps. */
export function useData<T>(loader: () => Promise<T>, deps: unknown[] = []): {
  data: T | undefined
  loading: boolean
  error: string | null
  reload: () => void
} {
  const [data, setData] = useState<T>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let alive = true
    setLoading(true)
    loader()
      .then((d) => alive && (setData(d), setError(null)))
      .catch((e) => alive && setError(String(e?.message ?? e)))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps])

  return { data, loading, error, reload }
}
