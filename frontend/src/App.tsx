import { useEffect, useMemo, useState } from 'react'
import { AppContext } from './app-context'
import { Sidebar } from './components/layout/Sidebar'
import { Toolbar } from './components/layout/Toolbar'
import { useActivity } from './features/activity/useActivity'
import { useDocuments } from './features/documents/hooks/useDocuments'
import { DocumentPreviewModal } from './features/documents/components/DocumentPreviewModal'
import { ActivityPage } from './pages/ActivityPage'
import { DashboardPage } from './pages/DashboardPage'
import { DevelopmentPage } from './pages/DevelopmentPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { ProfilePage } from './pages/ProfilePage'
import { RecentPage } from './pages/RecentPage'
import { SettingsPage } from './pages/SettingsPage'
import { SharedPage } from './pages/SharedPage'
import type { DocumentFilter, DocumentRecord, DocumentView, Page } from './types/document'

export default function App() {
  const { activity, logActivity } = useActivity()
  const documentState = useDocuments(logActivity)
  const [page, setPage] = useState<Page>('documents')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewDocument, setPreviewDocument] = useState<DocumentRecord | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<DocumentFilter>('all')
  const [view, setView] = useState<DocumentView>('list')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)

  useEffect(() => { setCurrentPage(1) }, [search, typeFilter, pageSize])

  const openPage = (nextPage: Page) => setPage(nextPage)
  const contextValue = useMemo(() => ({
    ...documentState, page, setPage, selectedFile, setSelectedFile, previewDocument, setPreviewDocument,
    search, setSearch, typeFilter, setTypeFilter, view, setView, pageSize, setPageSize,
    currentPage, setCurrentPage, notificationsEnabled, setNotificationsEnabled, activity, openPage,
  }), [documentState, page, selectedFile, previewDocument, search, typeFilter, view, pageSize, currentPage, notificationsEnabled, activity, openPage])

  function renderCurrentPage() {
    switch (page) {
      case 'documents': return <DocumentsPage />
      case 'dashboard': return <DashboardPage />
      case 'activity': return <ActivityPage />
      case 'shared': return <SharedPage />
      case 'recent': return <RecentPage />
      case 'settings': return <SettingsPage />
      case 'development': return <DevelopmentPage />
      case 'notifications': return <NotificationsPage />
      case 'profile': return <ProfilePage />
      default: return <DocumentsPage />
    }
  }

  return <AppContext.Provider value={contextValue}>
    <main className="workspace">
      <Sidebar page={page} onNavigate={openPage} />
      <section className="workspace-main"><Toolbar />{renderCurrentPage()}</section>
      {previewDocument && <DocumentPreviewModal file={previewDocument} onClose={() => setPreviewDocument(null)} />}
    </main>
  </AppContext.Provider>
}
