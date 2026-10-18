import { useRef } from 'react'
import { useAppContext } from '../../../app-context'
import { fileKind } from '../../../lib/file-utils'
import { formatBytes, formatDate } from '../../../lib/format'
import type { DocumentRecord } from '../../../types/document'

export function UploadPanel() {
  const inputRef = useRef<HTMLInputElement>(null)
  const {
    documents, selectedFile, setSelectedFile, isUploading, uploadProgress, upload,
    remove, deletingId, notificationsEnabled,
  } = useAppContext()
  const recentFiles = [...documents].sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()).slice(0, 5)

  async function handleUpload() {
    if (!selectedFile) return
    const succeeded = await upload(selectedFile, notificationsEnabled)
    if (succeeded) {
      setSelectedFile(null)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return <aside className="upload-panel" aria-label="Upload files and recent uploads">
    <section className="dropzone-section"><label className="dropzone" htmlFor="file-input"
      onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
        event.preventDefault()
        const file = event.dataTransfer.files?.[0]
        if (file && !isUploading) setSelectedFile(file)
      }}>
      <span className="cloud-upload" aria-hidden="true">⇧</span>
      <span className="dropzone-title">{selectedFile ? selectedFile.name : 'Drag And Drop Your Files Here'}</span>
      <span className="dropzone-subtitle">{selectedFile ? `${formatBytes(selectedFile.size)} · ${selectedFile.type || 'Unknown type'}` : 'or select a file from your computer'}</span>
      <span className="upload-button-look">{isUploading ? `Uploading ${uploadProgress}%` : 'Choose a file'}</span>
      <input ref={inputRef} id="file-input" type="file" disabled={isUploading} onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} />
    </label>
    <button className="upload-submit" type="button" onClick={() => void handleUpload()} disabled={!selectedFile || isUploading}>
      {isUploading ? `Uploading… ${uploadProgress}%` : 'Upload selected file'}</button>
    {isUploading && <div className="panel-progress" role="status" aria-live="polite"><div><span>Uploading file</span><strong>{uploadProgress}%</strong></div>
      <progress className="upload-progress" max={100} value={uploadProgress}>{uploadProgress}%</progress>
      <small>Transfer progress. Saving to storage and metadata finishes after transfer.</small></div>}
    </section>
    <div className="upload-queue-heading"><strong>Recent documents</strong><span>{documents.length}</span></div>
    <div className="recent-upload-list">{recentFiles.length === 0 ? <div className="recent-empty">Uploaded files will appear here.</div>
      : recentFiles.map((file: DocumentRecord) => <article className="recent-upload-card" key={file.file_id}>
        <span className={`file-badge file-${fileKind(file).toLowerCase()}`}>{fileKind(file)}</span>
        <div className="recent-file-info"><strong title={file.filename}>{file.filename}</strong><span>{formatBytes(file.size_bytes)} · {formatDate(file.uploaded_at)}</span>
          <div className="recent-file-track"><span style={{ width: '100%' }} /></div></div>
        <button type="button" className="recent-action" onClick={() => void remove(file, notificationsEnabled)} disabled={deletingId === file.file_id}
          aria-label={`Delete ${file.filename}`} title="Delete file">×</button>
      </article>)}</div>
    <div className="storage-note"><span className="storage-dot" /><span>Files stored in <strong>SeaweedFS</strong><br />Metadata stored in <strong>PostgreSQL</strong></span></div>
  </aside>
}
