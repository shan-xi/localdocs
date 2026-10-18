import type { DocumentRecord } from '../../../types/document'
import { API_FILES_URL } from '../../../lib/config'
import { formatBytes } from '../../../lib/format'

export function DocumentPreviewModal({ file, onClose }: { file: DocumentRecord; onClose: () => void }) {
  const previewUrl = `${API_FILES_URL}/${encodeURIComponent(file.file_id)}?download=false`
  const downloadUrl = `${API_FILES_URL}/${encodeURIComponent(file.file_id)}`

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose()
  }}>
    <section className="preview-modal" role="dialog" aria-modal="true" aria-labelledby="preview-title">
      <header className="preview-header"><div>
        <p className="eyebrow">DOCUMENT PREVIEW</p>
        <h2 id="preview-title" title={file.filename}>{file.filename}</h2>
        <p className="preview-meta">{formatBytes(file.size_bytes)} · {file.content_type}</p>
      </div><button className="close-button" type="button" aria-label="Close preview" onClick={onClose}>×</button></header>
      <div className="preview-content">{file.content_type.startsWith('image/')
        ? <img className="preview-image" src={previewUrl} alt={file.filename} />
        : <iframe className="preview-frame" src={previewUrl} title={`Preview of ${file.filename}`} />}</div>
      <footer className="preview-footer"><a className="download-link" href={downloadUrl}>Download original</a>
        <button className="refresh-button" type="button" onClick={onClose}>Close</button></footer>
    </section>
  </div>
}
