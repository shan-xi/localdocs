import type { DocumentRecord } from '../types/document'

export function canPreview(file: DocumentRecord): boolean {
  return file.content_type.startsWith('image/') ||
    file.content_type === 'application/pdf' ||
    file.content_type.startsWith('text/')
}

export function fileKind(file: DocumentRecord | File): string {
  const name = 'filename' in file ? file.filename : file.name
  const type = 'content_type' in file ? file.content_type : file.type
  if (type.includes('pdf') || name.toLowerCase().endsWith('.pdf')) return 'PDF'
  if (type.startsWith('image/png') || name.toLowerCase().endsWith('.png')) return 'PNG'
  if (type.startsWith('image/')) return 'IMG'
  if (type.startsWith('text/')) return 'TXT'
  const extension = name.split('.').pop()?.toUpperCase()
  return extension && extension !== name.toUpperCase() ? extension.slice(0, 4) : 'FILE'
}

export function documentType(file: DocumentRecord): string {
  if (file.content_type.startsWith('image/')) return 'Image'
  if (file.content_type === 'application/pdf') return 'PDF'
  if (file.content_type.startsWith('text/')) return 'Text'
  return 'File'
}

export function getErrorMessage(body: unknown, fallback: string): string {
  if (typeof body === 'object' && body !== null && 'detail' in body) {
    const detail = (body as { detail?: unknown }).detail
    if (typeof detail === 'string') return detail
  }
  return fallback
}

export function getDocumentUrl(fileId: string, download = true): string {
  const base = `${import.meta.env.VITE_API_BASE_URL || '/api'}`.replace(/\/+$/, '')
  const url = `${base}/files/${encodeURIComponent(fileId)}`
  return download ? url : `${url}?download=false`
}
