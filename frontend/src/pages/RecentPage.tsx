import { useDocumentData } from '../features/documents/context/DocumentDataContext'
import { useDocumentUIContext } from '../features/documents/context/DocumentUIContext'
import { useAppNavigation } from '../app/navigation'
import { EmptyState } from '../components/common/EmptyState'
import { API_FILES_URL } from '../lib/config'
import { canPreview, fileKind } from '../lib/file-utils'
import { formatBytes, formatDate } from '../lib/format'

export function RecentPage() {
  const { documents } = useDocumentData()
  const { setPreviewDocument } = useDocumentUIContext()
  const { openPage } = useAppNavigation()
  const recentFiles = [...documents].sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
  return <div className="app-page">
    <div className="page-heading"><p className="eyebrow">YOUR LIBRARY</p><h1>Recent documents</h1><p>Files ordered by their upload time, newest first.</p></div>
    {recentFiles.length ? <div className="page-card">{recentFiles.map((file) => <div className="page-list-row" key={file.file_id}>
      <span className={`file-badge file-${fileKind(file).toLowerCase()}`}>{fileKind(file)}</span>
      <div className="page-list-main"><strong>{file.filename}</strong><span>{formatBytes(file.size_bytes)} · {formatDate(file.uploaded_at)}</span></div>
      <button type="button" className="secondary-button" onClick={() => canPreview(file) && setPreviewDocument(file)} disabled={!canPreview(file)}>Preview</button>
      <a className="secondary-link" href={`${API_FILES_URL}/${encodeURIComponent(file.file_id)}`}>Download</a>
    </div>)}</div> : <EmptyState title="No recent documents" description="Upload a file from the Documents page and it will appear here." action="Go to Documents" onAction={() => openPage('documents')} />}
  </div>
}
