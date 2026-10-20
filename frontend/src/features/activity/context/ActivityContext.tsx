import { createContext, useContext, type ReactNode } from 'react'
import { useActivity } from '../useActivity'

type ActivityContextValue = ReturnType<typeof useActivity>
const ActivityContext = createContext<ActivityContextValue | null>(null)

export function ActivityProvider({ children }: { children: ReactNode }) {
  const activityState = useActivity()
  return <ActivityContext.Provider value={activityState}>{children}</ActivityContext.Provider>
}

export function useActivityContext() {
  const context = useContext(ActivityContext)
  if (context === null) {
    throw new Error('useActivityContext must be used inside ActivityProvider')
  }
  return context
}
