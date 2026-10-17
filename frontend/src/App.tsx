import { useCallback, useEffect, useMemo, useState } from 'react'

type DocumentRecord = {
  file_id: string
  filename: string
  content_type: string
  size_bytes: number
  uploaded_at: string
  download_url: string
}
type Page = 'documents' | 'dashboard' | 'activity' | 'shared' | 'recent' | 'settings' | 'development' | 'notifications' | 'profile'
type ActivityRecord = { id: number; message: string; at: string }

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}
function canPreview(file: DocumentRecord): boolean {
  return file.content_type.startsWith('image/') || file.content_type === 'application/pdf' || file.content_type.startsWith('text/')
}
function getErrorMessage(body: unknown, fallback: string): string {
  if (typeof body === 'object' && body !== null && 'detail' in body) {
    const detail = (body as { detail?: unknown }).detail
    if (typeof detail === 'string') return detail
  }
  return fallback
}
function fileKind(file: DocumentRecord | File): string {
  const name = 'filename' in file ? file.filename : file.name
  const type = 'content_type' in file ? file.content_type : file.type
  if (type.includes('pdf') || name.toLowerCase().endsWith('.pdf')) return 'PDF'
  if (type.startsWith('image/png') || name.toLowerCase().endsWith('.png')) return 'PNG'
  if (type.startsWith('image/')) return 'IMG'
  if (type.startsWith('text/')) return 'TXT'
  const ext = name.split('.').pop()?.toUpperCase()
  return ext && ext !== name.toUpperCase() ? ext.slice(0, 4) : 'FILE'
}
function documentType(file: DocumentRecord): string {
  if (file.content_type.startsWith('image/')) return 'Image'
  if (file.content_type === 'application/pdf') return 'PDF'
  if (file.content_type.startsWith('text/')) return 'Text'
  return 'File'
}

export default function App() {
  const [page, setPage] = useState<Page>('documents')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [previewDocument, setPreviewDocument] = useState<DocumentRecord | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [apiStatus, setApiStatus] = useState<'unknown' | 'online' | 'offline'>('unknown')
  const [activity, setActivity] = useState<ActivityRecord[]>([])

  const logActivity = useCallback((message: string) => {
    setActivity((previous) => [{ id: Date.now() + Math.random(), message, at: new Date().toISOString() }, ...previous].slice(0, 50))
  }, [])

  const loadDocuments = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true)
    try {
      const response = await fetch(`${API_BASE_URL}/files`)
      const body: unknown = await response.json()
      if (!response.ok) throw new Error(getErrorMessage(body, 'Could not load the document list.'))
      if (!Array.isArray(body)) throw new Error('The API returned an unexpected document list.')
      setDocuments(body as DocumentRecord[])
      setError('')
      if (showRefreshIndicator) logActivity('Refreshed the document list.')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load documents.')
      setApiStatus('offline')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [logActivity])
  useEffect(() => { void loadDocuments() }, [loadDocuments])

  async function checkApiHealth() {
    setApiStatus('unknown')
    try {
      const response = await fetch(`${API_BASE_URL}/health`)
      if (!response.ok) throw new Error('Health check failed')
      setApiStatus('online')
    } catch {
      setApiStatus('offline')
    }
  }
  useEffect(() => { void checkApiHealth() }, [])

  async function handleUpload() {
    if (!selectedFile) { setError('Choose a file before uploading.'); return }
    setIsUploading(true); setUploadProgress(0); setError(''); setNotice('')
    const formData = new FormData(); formData.append('file', selectedFile)
    try {
      const uploaded = await new Promise<DocumentRecord>((resolve, reject) => {
        const request = new XMLHttpRequest()
        request.open('POST', `${API_BASE_URL}/files`)
        request.upload.addEventListener('progress', (event) => { if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 100)) })
        request.addEventListener('load', () => {
          let body: unknown
          try { body = JSON.parse(request.responseText) } catch { reject(new Error('The server returned an invalid response.')); return }
          if (request.status < 200 || request.status >= 300) { reject(new Error(getErrorMessage(body, 'Upload failed.'))); return }
          resolve(body as DocumentRecord)
        })
        request.addEventListener('error', () => reject(new Error('Network error while uploading the file.')))
        request.addEventListener('abort', () => reject(new Error('The upload was cancelled.')))
        request.send(formData)
      })
      setUploadProgress(100); setSelectedFile(null)
      const picker = document.getElementById('file-input') as HTMLInputElement | null
      if (picker) picker.value = ''
      setNotice(notificationsEnabled ? `Uploaded “${uploaded.filename}” successfully.` : '')
      logActivity(`Uploaded “${uploaded.filename}”.`)
      await loadDocuments()
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.') }
    finally { setIsUploading(false) }
  }

  async function handleDelete(file: DocumentRecord) {
    if (!window.confirm(`Delete “${file.filename}”? This removes the file and its metadata.`)) return
    setDeletingId(file.file_id); setError(''); setNotice('')
    try {
      const response = await fetch(`${API_BASE_URL}/files/${encodeURIComponent(file.file_id)}`, { method: 'DELETE' })
      if (!response.ok) { let body: unknown; try { body = await response.json() } catch { body = null }; throw new Error(getErrorMessage(body, 'Delete failed.')) }
      if (previewDocument?.file_id === file.file_id) setPreviewDocument(null)
      setNotice(notificationsEnabled ? `Deleted “${file.filename}”.` : '')
      logActivity(`Deleted “${file.filename}”.`)
      await loadDocuments()
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : 'Delete failed.') }
    finally { setDeletingId(null) }
  }

  const filteredDocuments = useMemo(() => documents.filter((file) => {
    const matchesSearch = file.filename.toLowerCase().includes(search.toLowerCase().trim())
    const matchesType = typeFilter === 'all' || (typeFilter === 'images' ? file.content_type.startsWith('image/') : typeFilter === 'pdf' ? file.content_type === 'application/pdf' : typeFilter === 'text' ? file.content_type.startsWith('text/') : !file.content_type.startsWith('image/') && file.content_type !== 'application/pdf' && !file.content_type.startsWith('text/'))
    return matchesSearch && matchesType
  }), [documents, search, typeFilter])
  useEffect(() => { setCurrentPage(1) }, [search, typeFilter, pageSize])
  const pageCount = Math.max(1, Math.ceil(filteredDocuments.length / pageSize))
  const safePage = Math.min(currentPage, pageCount)
  const paginatedDocuments = filteredDocuments.slice((safePage - 1) * pageSize, safePage * pageSize)
  const previewUrl = previewDocument ? `${API_BASE_URL}/files/${encodeURIComponent(previewDocument.file_id)}?download=false` : ''
  const recentFiles = [...documents].sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()).slice(0, 5)
  const totalBytes = documents.reduce((sum, file) => sum + file.size_bytes, 0)
  const filterLabels: Record<string, string> = { all: 'All Documents', images: 'Images', pdf: 'PDF documents', text: 'Text documents', other: 'Other files' }

  function openPage(nextPage: Page) {
    setPage(nextPage)
  }

  function renderDocumentRows(items: DocumentRecord[]) {
    if (view === 'grid') return <div className="files-grid">{items.map((file) => <article className="grid-file-card" key={file.file_id}><span className={`file-badge file-${fileKind(file).toLowerCase()}`}>{fileKind(file)}</span><strong title={file.filename}>{file.filename}</strong><span>{formatBytes(file.size_bytes)} · {new Date(file.uploaded_at).toLocaleDateString()}</span><div><button type="button" onClick={() => canPreview(file) && setPreviewDocument(file)} disabled={!canPreview(file)}>Preview</button><a href={`${API_BASE_URL}/files/${encodeURIComponent(file.file_id)}`}>Download</a><button type="button" onClick={() => void handleDelete(file)} disabled={deletingId === file.file_id}>Delete</button></div></article>)}</div>
    return <div className="files-table">{items.map((file) => <article className="file-table-row" key={file.file_id}>
      <button className="file-name-cell" type="button" onClick={() => canPreview(file) && setPreviewDocument(file)} title={canPreview(file) ? 'Preview file' : file.filename}><span className={`file-badge file-${fileKind(file).toLowerCase()}`}>{fileKind(file)}</span><span className="file-name-text">{file.filename}</span></button>
      <span className="file-size">{formatBytes(file.size_bytes)}</span><span className="shared-cell">—</span><span className="type-cell">{documentType(file)}</span><span className="date-cell">{new Date(file.uploaded_at).toLocaleDateString()}</span>
      <div className="row-menu"><a href={`${API_BASE_URL}/files/${encodeURIComponent(file.file_id)}`} title="Download" aria-label={`Download ${file.filename}`}>↓</a><button type="button" onClick={() => canPreview(file) && setPreviewDocument(file)} title="Preview" aria-label={`Preview ${file.filename}`} disabled={!canPreview(file)}>↗</button><button type="button" onClick={() => void handleDelete(file)} disabled={deletingId === file.file_id} title="Delete" aria-label={`Delete ${file.filename}`}>×</button></div>
    </article>)}</div>
  }

  function renderRecentPage() {
    const list = [...documents].sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
    return <div className="app-page"><div className="page-heading"><p className="eyebrow">YOUR LIBRARY</p><h1>Recent documents</h1><p>Files ordered by their upload time, newest first.</p></div>{list.length ? <div className="page-card">{list.map((file) => <div className="page-list-row" key={file.file_id}><span className={`file-badge file-${fileKind(file).toLowerCase()}`}>{fileKind(file)}</span><div className="page-list-main"><strong>{file.filename}</strong><span>{formatBytes(file.size_bytes)} · {formatDate(file.uploaded_at)}</span></div><button type="button" className="secondary-button" onClick={() => canPreview(file) && setPreviewDocument(file)} disabled={!canPreview(file)}>Preview</button><a className="secondary-link" href={`${API_BASE_URL}/files/${encodeURIComponent(file.file_id)}`}>Download</a></div>)}</div> : <EmptyState title="No recent documents" description="Upload a file from the Documents page and it will appear here." action="Go to Documents" onAction={() => openPage('documents')} />}</div>
  }

  function renderPage() {
    if (page === 'documents') return <div className="content-layout">
      <section className="document-workarea" id="documents">
        <div className="page-title-row"><h1>Documents</h1><div className="filters"><label className="filter-pill"><span className="filter-label">{filterLabels[typeFilter]}</span><select aria-label="Filter documents" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">All Documents</option><option value="images">Images</option><option value="pdf">PDF documents</option><option value="text">Text documents</option><option value="other">Other files</option></select><span>⌄</span></label></div></div>
        {error && <p className="message error-message" role="alert">{error}</p>}{notice && <p className="message success-message" role="status">{notice}</p>}
        <div className="table-head"><span>Name</span><span>Size</span><span>Shared</span><span>Type</span><span>Date</span><span /></div>
        {isLoading ? <div className="table-empty" role="status">Loading your documents…</div> : filteredDocuments.length === 0 ? <div className="table-empty"><strong>{documents.length ? 'No matching documents' : 'No documents yet'}</strong><span>{documents.length ? 'Try another search or filter.' : 'Upload your first file using the panel on the right.'}</span></div> : renderDocumentRows(paginatedDocuments)}
        <footer className="table-footer pagination-footer"><span>{filteredDocuments.length === 0 ? 'Showing 0 documents' : `Showing ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filteredDocuments.length)} of ${filteredDocuments.length}`}</span><div className="pagination-controls"><label>Rows per page <select aria-label="Rows per page" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}><option value={5}>5</option><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></label><button type="button" onClick={() => setCurrentPage((value) => Math.max(1, value - 1))} disabled={safePage <= 1}>Previous</button><span className="page-count">Page {safePage} of {pageCount}</span><button type="button" onClick={() => setCurrentPage((value) => Math.min(pageCount, value + 1))} disabled={safePage >= pageCount}>Next</button></div></footer>
      </section>
      <aside className="upload-panel" aria-label="Upload files and recent uploads">
        <section className="dropzone-section"><label className="dropzone" htmlFor="file-input" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files?.[0]; if (file && !isUploading) { setSelectedFile(file); setError(''); setNotice('') } }}><span className="cloud-upload" aria-hidden="true">⇧</span><span className="dropzone-title">{selectedFile ? selectedFile.name : 'Drag And Drop Your Files Here'}</span><span className="dropzone-subtitle">{selectedFile ? `${formatBytes(selectedFile.size)} · ${selectedFile.type || 'Unknown type'}` : 'or select a file from your computer'}</span><span className="upload-button-look">{isUploading ? `Uploading ${uploadProgress}%` : 'Choose a file'}</span><input id="file-input" type="file" disabled={isUploading} onChange={(event) => { setSelectedFile(event.target.files?.[0] ?? null); setError(''); setNotice('') }} /></label>
          <button className="upload-submit" type="button" onClick={() => void handleUpload()} disabled={!selectedFile || isUploading}>{isUploading ? `Uploading… ${uploadProgress}%` : 'Upload selected file'}</button>
          {isUploading && <div className="panel-progress" role="status" aria-live="polite"><div><span>Uploading file</span><strong>{uploadProgress}%</strong></div><progress className="upload-progress" max={100} value={uploadProgress}>{uploadProgress}%</progress><small>Transfer progress. Saving to storage and metadata finishes after transfer.</small></div>}
        </section>
        <div className="upload-queue-heading"><strong>Recent documents</strong><span>{documents.length}</span></div>
        <div className="recent-upload-list">{recentFiles.length === 0 ? <div className="recent-empty">Uploaded files will appear here.</div> : recentFiles.map((file) => <article className="recent-upload-card" key={file.file_id}><span className={`file-badge file-${fileKind(file).toLowerCase()}`}>{fileKind(file)}</span><div className="recent-file-info"><strong title={file.filename}>{file.filename}</strong><span>{formatBytes(file.size_bytes)} · {formatDate(file.uploaded_at)}</span><div className="recent-file-track"><span style={{ width: '100%' }} /></div></div><button type="button" className="recent-action" onClick={() => void handleDelete(file)} disabled={deletingId === file.file_id} aria-label={`Delete ${file.filename}`} title="Delete file">×</button></article>)}</div>
        <div className="storage-note"><span className="storage-dot" /><span>Files stored in <strong>SeaweedFS</strong><br />Metadata stored in <strong>PostgreSQL</strong></span></div>
      </aside>
    </div>

    if (page === 'recent') return renderRecentPage()
    if (page === 'dashboard') return <div className="app-page"><div className="page-heading"><p className="eyebrow">OVERVIEW</p><h1>Dashboard</h1><p>A quick overview of your local document library.</p></div><div className="stats-grid"><StatCard label="Total documents" value={String(documents.length)} detail="Metadata records in PostgreSQL" /><StatCard label="Total file size" value={formatBytes(totalBytes)} detail="Combined size of stored files" /><StatCard label="Images" value={String(documents.filter((f) => f.content_type.startsWith('image/')).length)} detail="Image documents" /><StatCard label="API status" value={apiStatus === 'online' ? 'Online' : apiStatus === 'offline' ? 'Offline' : 'Checking'} detail={API_BASE_URL} /></div><div className="page-section-title"><h2>Recently added</h2><button className="secondary-button" type="button" onClick={() => openPage('recent')}>View all recent</button></div><div className="page-card">{recentFiles.length ? recentFiles.map((file) => <div className="page-list-row" key={file.file_id}><span className={`file-badge file-${fileKind(file).toLowerCase()}`}>{fileKind(file)}</span><div className="page-list-main"><strong>{file.filename}</strong><span>{formatBytes(file.size_bytes)} · {formatDate(file.uploaded_at)}</span></div><button className="secondary-button" type="button" onClick={() => canPreview(file) && setPreviewDocument(file)} disabled={!canPreview(file)}>Preview</button></div>) : <p className="muted-copy">No files yet. Go to Documents to upload your first file.</p>}</div></div>
    if (page === 'activity') return <div className="app-page"><div className="page-heading"><p className="eyebrow">LOCAL SESSION</p><h1>Activity</h1><p>Actions performed during this open browser session.</p></div>{activity.length ? <div className="page-card">{activity.map((item) => <div className="activity-row" key={item.id}><span className="activity-dot" /><div><strong>{item.message}</strong><span>{formatDate(item.at)}</span></div></div>)}</div> : <EmptyState title="No activity yet" description="Uploads, deletions, and manual refreshes will appear here while this page remains open." action="Go to Documents" onAction={() => openPage('documents')} />}</div>
    if (page === 'shared') return <div className="app-page"><div className="page-heading"><p className="eyebrow">COLLABORATION</p><h1>Shared files</h1><p>Files shared with other users.</p></div><EmptyState title="File sharing is not enabled" description="This local learning project currently supports personal file upload, preview, download, and deletion. It has no sharing API or user-permission model yet, so there are no shared files to display." action="Back to Documents" onAction={() => openPage('documents')} /></div>
    if (page === 'settings') return <div className="app-page"><div className="page-heading"><p className="eyebrow">PREFERENCES</p><h1>Settings</h1><p>Adjust how the LocalDocs interface behaves in this session.</p></div><div className="page-card settings-card"><div className="setting-row"><div><strong>Default document view</strong><span>Choose how the document list is displayed.</span></div><select aria-label="Default document view" value={view} onChange={(event) => setView(event.target.value as 'list' | 'grid')}><option value="list">List</option><option value="grid">Grid</option></select></div><div className="setting-row"><div><strong>Rows per page</strong><span>Number of document records shown on each page.</span></div><select aria-label="Default rows per page" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}><option value={5}>5 rows</option><option value={10}>10 rows</option><option value={20}>20 rows</option><option value={50}>50 rows</option></select></div><div className="setting-row"><div><strong>In-app notifications</strong><span>Show success messages after file operations.</span></div><button className={`toggle-button ${notificationsEnabled ? 'toggle-on' : ''}`} type="button" role="switch" aria-checked={notificationsEnabled} onClick={() => setNotificationsEnabled((enabled) => !enabled)}>{notificationsEnabled ? 'On' : 'Off'}</button></div><p className="settings-footnote">These are frontend preferences for the current session; they are not saved to a user account or database.</p></div></div>
    if (page === 'development') return <div className="app-page"><div className="page-heading"><p className="eyebrow">ENVIRONMENT</p><h1>Local development</h1><p>Service endpoints and a live backend health check.</p></div><div className="page-card service-list"><div className="service-row"><div><strong>React + Vite frontend</strong><span>http://localhost:5173</span></div><span className="status-pill status-online">Running in browser</span></div><div className="service-row"><div><strong>FastAPI backend</strong><span>{API_BASE_URL}</span></div><span className={`status-pill ${apiStatus === 'online' ? 'status-online' : apiStatus === 'offline' ? 'status-offline' : 'status-pending'}`}>{apiStatus === 'online' ? 'Online' : apiStatus === 'offline' ? 'Offline' : 'Checking'}</span></div><div className="service-row"><div><strong>PostgreSQL</strong><span>Stores document metadata (accessed through FastAPI)</span></div><span className="status-pill status-info">Backend managed</span></div><div className="service-row"><div><strong>SeaweedFS</strong><span>Stores the actual uploaded file content</span></div><span className="status-pill status-info">Backend managed</span></div><div className="development-actions"><button className="primary-button" type="button" onClick={() => void checkApiHealth()}>Run health check</button><button className="secondary-button" type="button" onClick={() => void loadDocuments(true)}>Refresh document data</button><a className="secondary-link" href={`${API_BASE_URL}/docs`} target="_blank" rel="noreferrer">Open API docs ↗</a></div></div></div>
    if (page === 'notifications') return <div className="app-page"><div className="page-heading"><p className="eyebrow">UPDATES</p><h1>Notifications</h1><p>Messages generated by actions in this browser session.</p></div>{notice || error ? <div className="page-card notification-card"><span className={`notice-mark ${error ? 'notice-error' : ''}`}>{error ? '!' : '✓'}</span><div><strong>{error ? 'Latest error' : 'Latest notification'}</strong><p>{error || notice}</p></div><button className="secondary-button" type="button" onClick={() => { setNotice(''); setError('') }}>Dismiss</button></div> : <EmptyState title="You're all caught up" description="There are no current success or error messages. Upload, delete, or refresh documents to generate an update." action="Go to Documents" onAction={() => openPage('documents')} />}</div>
    return <div className="app-page"><div className="page-heading"><p className="eyebrow">LOCAL PROFILE</p><h1>Local user</h1><p>This application runs locally and does not have sign-in or account management.</p></div><div className="page-card profile-card"><div className="profile-avatar">L</div><div className="profile-main"><h2>Local user</h2><p>LocalDocs workspace</p><span className="status-pill status-info">No account connected</span></div><div className="profile-detail"><span>Workspace</span><strong>Local development</strong></div><div className="profile-detail"><span>API endpoint</span><strong>{API_BASE_URL}</strong></div><div className="profile-detail"><span>Documents available</span><strong>{documents.length}</strong></div><button className="primary-button" type="button" onClick={() => openPage('settings')}>Manage interface settings</button></div></div>
  }

  return <main className="workspace">
    <aside className="sidebar" aria-label="Main navigation">
      <button className="sidebar-brand" type="button" onClick={() => openPage('dashboard')} aria-label="LocalDocs home"><span>LD</span></button>
      <nav className="side-nav">
        <NavButton label="Documents" symbol="▤" active={page === 'documents'} onClick={() => openPage('documents')} />
        <NavButton label="Dashboard" symbol="▦" active={page === 'dashboard'} onClick={() => openPage('dashboard')} />
        <NavButton label="Activity" symbol="✳" active={page === 'activity'} onClick={() => openPage('activity')} />
        <NavButton label="Shared files" symbol="◌" active={page === 'shared'} onClick={() => openPage('shared')} />
        <NavButton label="Recent" symbol="◷" active={page === 'recent'} onClick={() => openPage('recent')} />
      </nav>
      <div className="side-bottom"><NavButton label="Settings" symbol="⚙" active={page === 'settings'} onClick={() => openPage('settings')} /><NavButton label="Local development" symbol="⌘" active={page === 'development'} onClick={() => openPage('development')} /></div>
    </aside>
    <section className="workspace-main">
      <header className="toolbar">
        <label className="search-box"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => { setSearch(event.target.value); if (page !== 'documents') setPage('documents') }} placeholder="Find Documents" aria-label="Find documents" /></label>
        <div className="view-switch"><span>View:</span><button type="button" className={view === 'grid' ? 'selected' : ''} onClick={() => setView('grid')}>▦ <span>Grid</span></button><button type="button" className={view === 'list' ? 'selected' : ''} onClick={() => setView('list')}>☷ <span>List</span></button></div>
        <div className="toolbar-spacer" />
        <button className="toolbar-icon" type="button" title="Refresh documents" aria-label="Refresh documents" onClick={() => { void loadDocuments(true); setNotice(notificationsEnabled ? 'Document list refresh requested.' : '') }} disabled={isRefreshing}>↻</button>
        <button className={`toolbar-icon notification-icon ${page === 'notifications' ? 'toolbar-active' : ''}`} type="button" aria-label="Notifications" title="Notifications" onClick={() => openPage('notifications')}>♧{notificationsEnabled && (notice || error) && <span className="notification-dot" />}</button>
        <button className={`avatar ${page === 'profile' ? 'avatar-active' : ''}`} type="button" aria-label="Local user profile" title="Local user" onClick={() => openPage('profile')}>L</button>
      </header>
      {renderPage()}
    </section>
    {previewDocument && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewDocument(null) }}><section className="preview-modal" role="dialog" aria-modal="true" aria-labelledby="preview-title"><header className="preview-header"><div><p className="eyebrow">DOCUMENT PREVIEW</p><h2 id="preview-title" title={previewDocument.filename}>{previewDocument.filename}</h2><p className="preview-meta">{formatBytes(previewDocument.size_bytes)} · {previewDocument.content_type}</p></div><button className="close-button" type="button" aria-label="Close preview" onClick={() => setPreviewDocument(null)}>×</button></header><div className="preview-content">{previewDocument.content_type.startsWith('image/') ? <img className="preview-image" src={previewUrl} alt={previewDocument.filename} /> : <iframe className="preview-frame" src={previewUrl} title={`Preview of ${previewDocument.filename}`} />}</div><footer className="preview-footer"><a className="download-link" href={`${API_BASE_URL}/files/${encodeURIComponent(previewDocument.file_id)}`}>Download original</a><button className="refresh-button" type="button" onClick={() => setPreviewDocument(null)}>Close</button></footer></section></div>}
  </main>
}

function NavButton({ label, symbol, active, onClick }: { label: string; symbol: string; active: boolean; onClick: () => void }) {
  return <button type="button" className={`side-nav-item ${active ? 'active' : ''}`} aria-label={label} title={label} onClick={onClick}><span aria-hidden="true">{symbol}</span><span className="nav-tooltip-label">{label}</span></button>
}
function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="stat-card"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>
}
function EmptyState({ title, description, action, onAction }: { title: string; description: string; action: string; onAction: () => void }) {
  return <div className="page-card empty-state"><span className="empty-state-icon">◇</span><h2>{title}</h2><p>{description}</p><button className="primary-button" type="button" onClick={onAction}>{action}</button></div>
}
