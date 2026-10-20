import { describe, expect, it } from 'vitest'
import type { DocumentRecord } from '../../types/document'
import { canPreview, documentType, fileKind, getDocumentUrl, getErrorMessage } from '../file-utils'

const record = (overrides: Partial<DocumentRecord> = {}): DocumentRecord => ({
  file_id: 'file 1',
  filename: 'report.pdf',
  content_type: 'application/pdf',
  size_bytes: 100,
  uploaded_at: '2026-01-01T00:00:00Z',
  download_url: '/files/file%201',
  ...overrides,
})

describe('canPreview', () => {
  it.each(['image/png', 'image/jpeg', 'application/pdf', 'text/plain'])(
    'supports preview for %s', (contentType) => {
      expect(canPreview(record({ content_type: contentType }))).toBe(true)
    },
  )

  it('does not preview unsupported binary types', () => {
    expect(canPreview(record({ content_type: 'application/zip' }))).toBe(false)
  })
})

describe('fileKind', () => {
  it('recognizes PDF and PNG files', () => {
    expect(fileKind(record())).toBe('PDF')
    expect(fileKind(record({ filename: 'picture.png', content_type: 'application/octet-stream' }))).toBe('PNG')
  })

  it('recognizes images, text, extensions and unknown files', () => {
    expect(fileKind(record({ filename: 'photo.jpg', content_type: 'image/jpeg' }))).toBe('IMG')
    expect(fileKind(record({ filename: 'notes.txt', content_type: 'text/plain' }))).toBe('TXT')
    expect(fileKind(record({ filename: 'archive.tar.gz', content_type: 'application/gzip' }))).toBe('GZ')
    expect(fileKind(record({ filename: 'README', content_type: 'application/octet-stream' }))).toBe('FILE')
  })

  it('accepts browser File objects', () => {
    const file = { name: 'notes.txt', type: 'text/plain' } as File
    expect(fileKind(file)).toBe('TXT')
  })
})

describe('documentType', () => {
  it('maps common content types to display labels', () => {
    expect(documentType(record({ content_type: 'image/png' }))).toBe('Image')
    expect(documentType(record({ content_type: 'application/pdf' }))).toBe('PDF')
    expect(documentType(record({ content_type: 'text/markdown' }))).toBe('Text')
    expect(documentType(record({ content_type: 'application/zip' }))).toBe('File')
  })
})

describe('getErrorMessage', () => {
  it('uses a string detail from an API error body', () => {
    expect(getErrorMessage({ detail: 'Not found' }, 'Fallback')).toBe('Not found')
  })

  it('uses fallback for malformed or non-string details', () => {
    expect(getErrorMessage({ detail: ['bad'] }, 'Fallback')).toBe('Fallback')
    expect(getErrorMessage(null, 'Fallback')).toBe('Fallback')
    expect(getErrorMessage('error', 'Fallback')).toBe('Fallback')
  })
})

describe('getDocumentUrl', () => {
  it('encodes the file id and defaults to download mode', () => {
    expect(getDocumentUrl('folder/file 1')).toBe('/api/files/folder%2Ffile%201')
  })

  it('supports inline preview mode', () => {
    expect(getDocumentUrl('abc', false)).toBe('/api/files/abc?download=false')
  })
})
