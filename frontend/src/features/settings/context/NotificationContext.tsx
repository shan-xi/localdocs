import { createContext, useContext, useState, type ReactNode } from 'react'

type NotificationContextValue = {
  notificationsEnabled: boolean
  setNotificationsEnabled: (enabled: boolean | ((previous: boolean) => boolean)) => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  return (
    <NotificationContext.Provider value={{ notificationsEnabled, setNotificationsEnabled }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotificationSettings() {
  const context = useContext(NotificationContext)
  if (context === null) {
    throw new Error('useNotificationSettings must be used inside NotificationProvider')
  }
  return context
}
