import type { DocumentRecord } from '../../../types/document'
import { API_FILES_URL } from '../../../lib/config'
import { formatBytes } from '../../../lib/format'

export function DocumentPreviewModal({ document, onClose }: { document: DocumentRecord; onClose: () => void }) {
  const previewUrl = `${API_FILES_URL}/${encodeURIComponent(document.file_id)}?download=false`
  const downloadUrl = `${API_FILES_URL}/${encodeURIComponent(document.file_id)}`

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose()
  }}>
    <section className="preview-modal" role="dialog" aria-modal="true" aria-labelledby="preview-title">
      <header className="preview-header"><div>
        <p className="eyebrow">DOCUMENT PREVIEW</p>
        <h2 id="preview-title" title={document.filename}>{document.filename}</h2>
        <p className="preview-meta">{formatBytes(document.size_bytes)} · {document.content_type}</p>
      </div><button className="close-button" type="button" aria-label="Close preview" onClick={onClose}>×</button></header>
      <div className="preview-content">{document.content_type.startsWith('image/')
        ? <img className="preview-image" src={previewUrl} alt={document.filename} />
        : <iframe className="preview-frame" src={previewUrl} title={`Preview of ${document.filename}`} />}</div>
      <footer className="preview-footer"><a className="download-link" href={downloadUrl}>Download original</a>
        <button className="refresh-button" type="button" onClick={onClose}>Close</button></footer>
    </section>
  </div>
}
