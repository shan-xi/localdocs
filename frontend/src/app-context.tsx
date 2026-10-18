import { createContext, useContext } from 'react'
import type { ActivityRecord, ApiStatus, DocumentRecord, DocumentFilter, DocumentView, Page } from './types/document'

type DocumentsState = {
  documents: DocumentRecord[]
  isLoading: boolean
  isRefreshing: boolean
  isUploading: boolean
  uploadProgress: number
  deletingId: string | null
  error: string
  notice: string
  apiStatus: ApiStatus
  loadDocuments: (showRefreshIndicator?: boolean) => Promise<void>
  refreshApiHealth: () => Promise<void>
  upload: (file: File, notificationsEnabled: boolean) => Promise<boolean>
  remove: (file: DocumentRecord, notificationsEnabled: boolean) => Promise<boolean>
  dismissMessages: () => void
  setSuccessNotice: (message: string) => void
}

type AppContextValue = DocumentsState & {
  page: Page
  setPage: (page: Page) => void
  selectedFile: File | null
  setSelectedFile: (file: File | null) => void
  previewDocument: DocumentRecord | null
  setPreviewDocument: (file: DocumentRecord | null) => void
  search: string
  setSearch: (value: string) => void
  typeFilter: DocumentFilter
  setTypeFilter: (value: DocumentFilter) => void
  view: DocumentView
  setView: (value: DocumentView) => void
  pageSize: number
  setPageSize: (value: number) => void
  currentPage: number
  setCurrentPage: (value: number) => void
  notificationsEnabled: boolean
  setNotificationsEnabled: (value: boolean | ((previous: boolean) => boolean)) => void
  activity: ActivityRecord[]
  openPage: (page: Page) => void
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useAppContext(): AppContextValue {
  const value = useContext(AppContext)
  if (!value) throw new Error('useAppContext must be used within AppContext.Provider')
  return value
}
