import { useCallback, useMemo, useState } from 'react'
import type { ActivityRecord } from '../../types/document'

export function useActivity() {
  const [activity, setActivity] = useState<ActivityRecord[]>([])

  const logActivity = useCallback((message: string) => {
    setActivity((previous) => [{
      id: Date.now() + Math.random(),
      message,
      at: new Date().toISOString(),
    }, ...previous].slice(0, 50))
  }, [])

  return useMemo(() => ({ activity, logActivity }), [activity, logActivity])
}
