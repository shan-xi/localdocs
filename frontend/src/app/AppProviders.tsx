import type { ReactNode } from 'react'
import { ActivityProvider } from '../features/activity/context/ActivityContext'
import { DocumentDataProvider } from '../features/documents/context/DocumentDataContext'
import { DocumentUIProvider } from '../features/documents/context/DocumentUIContext'
import { NotificationProvider } from '../features/settings/context/NotificationContext'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ActivityProvider>
      <DocumentDataProvider>
        <DocumentUIProvider>
          <NotificationProvider>{children}</NotificationProvider>
        </DocumentUIProvider>
      </DocumentDataProvider>
    </ActivityProvider>
  )
}
