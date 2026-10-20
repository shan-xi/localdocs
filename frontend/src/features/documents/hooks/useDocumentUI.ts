import { useCallback, useEffect, useState } from 'react'
import type {
  DocumentFilter,
  DocumentRecord,
  DocumentView,
} from '../../../types/document'

export function useDocumentUI() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewDocument, setPreviewDocument] = useState<DocumentRecord | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<DocumentFilter>('all')
  const [view, setView] = useState<DocumentView>('list')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    setCurrentPage(1)
  }, [search, typeFilter, pageSize])

  const closePreview = useCallback(() => setPreviewDocument(null), [])

  return {
    selectedFile, setSelectedFile,
    previewDocument, setPreviewDocument, closePreview,
    search, setSearch,
    typeFilter, setTypeFilter,
    view, setView,
    pageSize, setPageSize,
    currentPage, setCurrentPage,
  }
}
