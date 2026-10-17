import { useCallback, useEffect, useState } from 'react'

type DocumentRecord = {
  file_id: string
  filename: string
  content_type: string
  size_bytes: number
  uploaded_at: string
  download_url: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString()
}

export default function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadDocuments = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/files`)
      if (!response.ok) throw new Error('Could not load the document list.')
      setDocuments((await response.json()) as DocumentRecord[])
      setError('')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load documents.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void loadDocuments() }, [loadDocuments])

  async function handleUpload() {
    if (!selectedFile) {
      setError('Choose a file before uploading.')
      return
    }

    setIsUploading(true)
    setError('')
    setNotice('')
    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const response = await fetch(`${API_BASE_URL}/files`, { method: 'POST', body: formData })
      const body = await response.json()
      if (!response.ok) throw new Error(typeof body.detail === 'string' ? body.detail : 'Upload failed.')
      setSelectedFile(null)
      const picker = document.getElementById('file-input') as HTMLInputElement | null
      if (picker) picker.value = ''
      setNotice(`Uploaded “${body.filename}” and saved its metadata to PostgreSQL.`)
      await loadDocuments()
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  async function handleDelete(document: DocumentRecord) {
    if (!window.confirm(`Delete “${document.filename}”? This removes the file and its metadata.`)) return
    setDeletingId(document.file_id)
    setError('')
    setNotice('')
    try {
      const response = await fetch(`${API_BASE_URL}/files/${encodeURIComponent(document.file_id)}`, { method: 'DELETE' })
      if (!response.ok) {
        const body = await response.json()
        throw new Error(typeof body.detail === 'string' ? body.detail : 'Delete failed.')
      }
      setNotice(`Deleted “${document.filename}”.`)
      await loadDocuments()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Delete failed.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="LocalDocs home"><span className="brand-mark">LD</span><span>LocalDocs</span></a>
        <span className="environment-label">LOCAL DEVELOPMENT</span>
      </header>

      <section className="hero">
        <p className="eyebrow">STAGE 3 · PERSISTENT METADATA</p>
        <h1>Your files, organized.</h1>
        <p className="hero-copy">File content lives in SeaweedFS. PostgreSQL keeps each document’s name, type, size, storage ID, and upload time—so the list remains available when you revisit the page.</p>
      </section>

      <section className="upload-card" aria-labelledby="upload-title">
        <div className="card-heading">
          <div><p className="eyebrow">DOCUMENT STORAGE</p><h2 id="upload-title">Upload a document</h2></div>
          <span className="storage-chip">SeaweedFS + PostgreSQL</span>
        </div>
        <label className="file-picker" htmlFor="file-input">
          <span className="file-picker-icon" aria-hidden="true">↑</span>
          <span className="file-picker-copy"><strong>{selectedFile ? selectedFile.name : 'Choose a file to upload'}</strong><span>{selectedFile ? formatBytes(selectedFile.size) : 'Files are stored by SeaweedFS and indexed in PostgreSQL'}</span></span>
          <input id="file-input" type="file" onChange={(event) => { setSelectedFile(event.target.files?.[0] ?? null); setError(''); setNotice('') }} />
        </label>
        <button className="primary-button" type="button" onClick={handleUpload} disabled={!selectedFile || isUploading}>{isUploading ? 'Uploading…' : 'Upload file'}</button>
        {error && <p className="message error-message" role="alert">{error}</p>}
        {notice && <p className="message success-message" role="status">{notice}</p>}
      </section>

      <section className="documents-section" aria-labelledby="documents-title">
        <div className="documents-heading"><div><p className="eyebrow">POSTGRESQL METADATA</p><h2 id="documents-title">Your documents <span className="count-chip">{documents.length}</span></h2></div><button className="refresh-button" type="button" onClick={() => void loadDocuments()}>Refresh ↻</button></div>
        {isLoading ? <p className="empty-state">Loading your documents…</p> : documents.length === 0 ? <div className="empty-state"><strong>No documents yet</strong><span>Upload a file above and it will appear here.</span></div> : (
          <div className="document-list">
            {documents.map((document) => (
              <article className="document-row" key={document.file_id}>
                <div className="document-icon" aria-hidden="true">▤</div>
                <div className="document-info"><strong title={document.filename}>{document.filename}</strong><span>{formatBytes(document.size_bytes)} · {document.content_type}</span><span>Uploaded {formatDate(document.uploaded_at)}</span><code title={document.file_id}>{document.file_id}</code></div>
                <div className="document-actions"><a className="download-link" href={`${API_BASE_URL}/files/${encodeURIComponent(document.file_id)}`}>Download</a><button className="delete-button" type="button" disabled={deletingId === document.file_id} onClick={() => void handleDelete(document)}>{deletingId === document.file_id ? 'Deleting…' : 'Delete'}</button></div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="page-footer"><span>React + TypeScript</span><span>·</span><span>FastAPI</span><span>·</span><span>PostgreSQL metadata</span><span>·</span><span>SeaweedFS file content</span></footer>
    </main>
  )
}
