import { useMemo } from 'react'
import { useAppContext } from '../../../app-context'
import { API_FILES_URL } from '../../../lib/config'
import { canPreview, documentType, fileKind } from '../../../lib/file-utils'
import { formatBytes, formatShortDate } from '../../../lib/format'
import type { DocumentFilter, DocumentRecord } from '../../../types/document'

const FILTER_LABELS: Record<DocumentFilter, string> = {
  all: 'All Documents', images: 'Images', pdf: 'PDF documents', text: 'Text documents', other: 'Other files',
}

function matchesFilter(file: DocumentRecord, filter: DocumentFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'images') return file.content_type.startsWith('image/')
  if (filter === 'pdf') return file.content_type === 'application/pdf'
  if (filter === 'text') return file.content_type.startsWith('text/')
  return !file.content_type.startsWith('image/') && file.content_type !== 'application/pdf' && !file.content_type.startsWith('text/')
}

export function DocumentList() {
  const {
    documents, isLoading, view, search, typeFilter, setTypeFilter, setPreviewDocument,
    remove, deletingId, notificationsEnabled, pageSize, setPageSize, currentPage, setCurrentPage,
  } = useAppContext()

  const filteredDocuments = useMemo(() => documents.filter((file) =>
    file.filename.toLowerCase().includes(search.toLowerCase().trim()) && matchesFilter(file, typeFilter)
  ), [documents, search, typeFilter])
  const pageCount = Math.max(1, Math.ceil(filteredDocuments.length / pageSize))
  const safePage = Math.min(currentPage, pageCount)
  const paginatedDocuments = filteredDocuments.slice((safePage - 1) * pageSize, safePage * pageSize)

  function preview(file: DocumentRecord) {
    if (canPreview(file)) setPreviewDocument(file)
  }

  function renderGrid(items: DocumentRecord[]) {
    return <div className="files-grid">{items.map((file) => <article className="grid-file-card" key={file.file_id}>
      <span className={`file-badge file-${fileKind(file).toLowerCase()}`}>{fileKind(file)}</span>
      <strong title={file.filename}>{file.filename}</strong>
      <span>{formatBytes(file.size_bytes)} · {formatShortDate(file.uploaded_at)}</span>
      <div>
        <button type="button" onClick={() => preview(file)} disabled={!canPreview(file)}>Preview</button>
        <a href={`${API_FILES_URL}/${encodeURIComponent(file.file_id)}`}>Download</a>
        <button type="button" onClick={() => void remove(file, notificationsEnabled)} disabled={deletingId === file.file_id}>Delete</button>
      </div>
    </article>)}</div>
  }

  function renderList(items: DocumentRecord[]) {
    return <div className="files-table">{items.map((file) => <article className="file-table-row" key={file.file_id}>
      <button className="file-name-cell" type="button" onClick={() => preview(file)} title={canPreview(file) ? 'Preview file' : file.filename}>
        <span className={`file-badge file-${fileKind(file).toLowerCase()}`}>{fileKind(file)}</span>
        <span className="file-name-text">{file.filename}</span>
      </button>
      <span className="file-size">{formatBytes(file.size_bytes)}</span><span className="shared-cell">—</span>
      <span className="type-cell">{documentType(file)}</span><span className="date-cell">{formatShortDate(file.uploaded_at)}</span>
      <div className="row-menu">
        <a href={`${API_FILES_URL}/${encodeURIComponent(file.file_id)}`} title="Download" aria-label={`Download ${file.filename}`}>↓</a>
        <button type="button" onClick={() => preview(file)} title="Preview" aria-label={`Preview ${file.filename}`} disabled={!canPreview(file)}>↗</button>
        <button type="button" onClick={() => void remove(file, notificationsEnabled)} disabled={deletingId === file.file_id}
          title="Delete" aria-label={`Delete ${file.filename}`}>×</button>
      </div>
    </article>)}</div>
  }

  return <>
    <div className="page-title-row"><h1>Documents</h1>
      <div className="filters"><label className="filter-pill"><span className="filter-label">{FILTER_LABELS[typeFilter]}</span>
        <select aria-label="Filter documents" value={typeFilter} onChange={(event) => {
          setTypeFilter(event.target.value as DocumentFilter); setCurrentPage(1)
        }}>
          <option value="all">All Documents</option><option value="images">Images</option><option value="pdf">PDF documents</option>
          <option value="text">Text documents</option><option value="other">Other files</option>
        </select><span>⌄</span></label></div>
    </div>
    <div className="table-head"><span>Name</span><span>Size</span><span>Shared</span><span>Type</span><span>Date</span><span /></div>
    {isLoading ? <div className="table-empty" role="status">Loading your documents…</div>
      : filteredDocuments.length === 0 ? <div className="table-empty"><strong>{documents.length ? 'No matching documents' : 'No documents yet'}</strong>
        <span>{documents.length ? 'Try another search or filter.' : 'Upload your first file using the panel on the right.'}</span></div>
      : view === 'grid' ? renderGrid(paginatedDocuments) : renderList(paginatedDocuments)}
    <footer className="table-footer pagination-footer">
      <span>{filteredDocuments.length === 0 ? 'Showing 0 documents' : `Showing ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filteredDocuments.length)} of ${filteredDocuments.length}`}</span>
      <div className="pagination-controls"><label>Rows per page <select aria-label="Rows per page" value={pageSize} onChange={(event) => {
        setPageSize(Number(event.target.value)); setCurrentPage(1)
      }}><option value={5}>5</option><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></label>
        <button type="button" onClick={() => setCurrentPage(Math.max(1, safePage - 1))} disabled={safePage <= 1}>Previous</button>
        <span className="page-count">Page {safePage} of {pageCount}</span>
        <button type="button" onClick={() => setCurrentPage(Math.min(pageCount, safePage + 1))} disabled={safePage >= pageCount}>Next</button>
      </div>
    </footer>
  </>
}
