import { useAppContext } from '../app-context'
import { EmptyState } from '../components/common/EmptyState'
import { StatCard } from '../components/common/StatCard'
import { API_BASE_URL } from '../lib/config'
import { canPreview, fileKind } from '../lib/file-utils'
import { formatBytes, formatDate } from '../lib/format'

export function DashboardPage() {
  const { documents, apiStatus, setPreviewDocument, openPage } = useAppContext()
  const recentFiles = [...documents].sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()).slice(0, 5)
  const totalBytes = documents.reduce((sum, file) => sum + file.size_bytes, 0)
  const status = apiStatus === 'online' ? 'Online' : apiStatus === 'offline' ? 'Offline' : 'Checking'

  return <div className="app-page">
    <div className="page-heading"><p className="eyebrow">OVERVIEW</p><h1>Dashboard</h1><p>A quick overview of your local document library.</p></div>
    <div className="stats-grid">
      <StatCard label="Total documents" value={String(documents.length)} detail="Metadata records in PostgreSQL" />
      <StatCard label="Total file size" value={formatBytes(totalBytes)} detail="Combined size of stored files" />
      <StatCard label="Images" value={String(documents.filter((file) => file.content_type.startsWith('image/')).length)} detail="Image documents" />
      <StatCard label="API status" value={status} detail={API_BASE_URL} />
    </div>
    <div className="page-section-title"><h2>Recently added</h2><button className="secondary-button" type="button" onClick={() => openPage('recent')}>View all recent</button></div>
    {recentFiles.length ? <div className="page-card">{recentFiles.map((file) => <div className="page-list-row" key={file.file_id}>
      <span className={`file-badge file-${fileKind(file).toLowerCase()}`}>{fileKind(file)}</span>
      <div className="page-list-main"><strong>{file.filename}</strong><span>{formatBytes(file.size_bytes)} · {formatDate(file.uploaded_at)}</span></div>
      <button className="secondary-button" type="button" onClick={() => canPreview(file) && setPreviewDocument(file)} disabled={!canPreview(file)}>Preview</button>
    </div>)}</div> : <EmptyState title="No documents yet" description="Upload your first document to see your library statistics here." action="Go to Documents" onAction={() => openPage('documents')} />}
  </div>
}
