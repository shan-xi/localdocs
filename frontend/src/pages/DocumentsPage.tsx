import { useDocumentData } from '../features/documents/context/DocumentDataContext'
import { DocumentList } from '../features/documents/components/DocumentList'
import { UploadPanel } from '../features/documents/components/UploadPanel'

export function DocumentsPage() {
  const { error, notice } = useDocumentData()
  return <div className="content-layout">
    <section className="document-workarea" id="documents">
      {error && <p className="message error-message" role="alert">{error}</p>}
      {notice && <p className="message success-message" role="status">{notice}</p>}
      <DocumentList />
    </section>
    <UploadPanel />
  </div>
}
