import { ActivityPage } from '../pages/ActivityPage'
import { DashboardPage } from '../pages/DashboardPage'
import { DevelopmentPage } from '../pages/DevelopmentPage'
import { DocumentsPage } from '../pages/DocumentsPage'
import { NotificationsPage } from '../pages/NotificationsPage'
import { ProfilePage } from '../pages/ProfilePage'
import { RecentPage } from '../pages/RecentPage'
import { SettingsPage } from '../pages/SettingsPage'
import { SharedPage } from '../pages/SharedPage'
import type { ComponentType } from 'react'
import type { Page } from '../types/document'

const pageComponents: Record<Page, ComponentType> = {
  documents: DocumentsPage,
  dashboard: DashboardPage,
  activity: ActivityPage,
  shared: SharedPage,
  recent: RecentPage,
  settings: SettingsPage,
  development: DevelopmentPage,
  notifications: NotificationsPage,
  profile: ProfilePage,
}

export function AppRoutes({ page }: { page: Page }) {
  const CurrentPage = pageComponents[page] ?? DocumentsPage
  return <CurrentPage />
}
