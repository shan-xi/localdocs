import { Sidebar } from './components/layout/Sidebar'
import { Toolbar } from './components/layout/Toolbar'
import { DocumentPreviewModal } from './features/documents/components/DocumentPreviewModal'
import { useDocumentUIContext } from './features/documents/context/DocumentUIContext'
import { useAppNavigation } from './app/navigation'
import { AppRoutes } from './app/routes'

export default function App() {
  const { page, openPage } = useAppNavigation()
  const { previewDocument, closePreview } = useDocumentUIContext()

  return (
    <main className="workspace">
      <Sidebar page={page} onNavigate={openPage} />
      <section className="workspace-main">
        <Toolbar />
        <AppRoutes page={page} />
      </section>
      {previewDocument && (
        <DocumentPreviewModal
          document={previewDocument}
          onClose={closePreview}
        />
      )}
    </main>
  )
}
