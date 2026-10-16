import { useState } from 'react'

type UploadedFile = {
  file_id: string
  filename: string
  content_type: string
  size_bytes: number
  download_url: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleUpload() {
    if (!selectedFile) {
      setError('Choose a file before uploading.')
      return
    }

    setIsUploading(true)
    setError('')
    setUploadedFile(null)

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const response = await fetch(`${API_BASE_URL}/files`, {
        method: 'POST',
        body: formData,
      })
      const body = await response.json()
      if (!response.ok) {
        throw new Error(typeof body.detail === 'string' ? body.detail : 'Upload failed.')
      }
      setUploadedFile(body as UploadedFile)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="LocalDocs home">
          <span className="brand-mark">LD</span>
          <span>LocalDocs</span>
        </a>
        <span className="environment-label">LOCAL DEVELOPMENT</span>
      </header>

      <section className="hero">
        <p className="eyebrow">STAGE 2 · FILE STORAGE</p>
        <h1>Your files, stored locally.</h1>
        <p className="hero-copy">
          Upload a file through FastAPI and store its content in SeaweedFS. This stage runs entirely on your computer.
        </p>
      </section>

      <section className="upload-card" aria-labelledby="upload-title">
        <div className="card-heading">
          <div>
            <p className="eyebrow">DOCUMENT STORAGE</p>
            <h2 id="upload-title">Upload a document</h2>
          </div>
          <span className="storage-chip">SeaweedFS</span>
        </div>

        <label className="file-picker">
          <span className="file-picker-icon" aria-hidden="true">↑</span>
          <span className="file-picker-copy">
            <strong>{selectedFile ? selectedFile.name : 'Choose a file to upload'}</strong>
            <span>{selectedFile ? formatBytes(selectedFile.size) : 'Any file type · Stored on your local Docker services'}</span>
          </span>
          <input
            type="file"
            onChange={(event) => {
              setSelectedFile(event.target.files?.[0] ?? null)
              setUploadedFile(null)
              setError('')
            }}
          />
        </label>

        <button className="primary-button" type="button" onClick={handleUpload} disabled={!selectedFile || isUploading}>
          {isUploading ? 'Uploading…' : 'Upload file'}
        </button>

        {error && <p className="message error-message" role="alert">{error}</p>}

        {uploadedFile && (
          <div className="result-panel" role="status">
            <p className="success-title">Upload complete</p>
            <dl>
              <div><dt>Filename</dt><dd>{uploadedFile.filename}</dd></div>
              <div><dt>Size</dt><dd>{formatBytes(uploadedFile.size_bytes)}</dd></div>
              <div><dt>Storage ID</dt><dd className="file-id">{uploadedFile.file_id}</dd></div>
            </dl>
            <a className="download-link" href={`${API_BASE_URL}/files/${encodeURIComponent(uploadedFile.file_id)}`}>
              Download stored file ↗
            </a>
            <p className="result-note">The file ID is temporary app metadata for this stage. A persistent document list will be added in a later stage.</p>
          </div>
        )}
      </section>

      <footer className="page-footer">
        <span>FastAPI API</span><span>·</span><span>SeaweedFS object storage</span><span>·</span><span>Docker Compose</span>
      </footer>
    </main>
  )
}
