import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ApiStatus, DocumentRecord } from '../../../types/document'
import { checkApiHealth as requestApiHealth, deleteDocument as requestDelete, fetchDocuments, uploadDocument as requestUpload } from '../../../api/documentsApi'

export function useDocuments(logActivity: (message: string) => void) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [apiStatus, setApiStatus] = useState<ApiStatus>('unknown')

  const loadDocuments = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true)
    try {
      const result = await fetchDocuments()
      setDocuments(result)
      setError('')
      if (showRefreshIndicator) logActivity('Refreshed the document list.')
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load documents.')
      setApiStatus('offline')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [logActivity])

  const refreshApiHealth = useCallback(async () => {
    setApiStatus('unknown')
    try {
      await requestApiHealth()
      setApiStatus('online')
    } catch {
      setApiStatus('offline')
    }
  }, [])

  useEffect(() => { void loadDocuments() }, [loadDocuments])
  useEffect(() => { void refreshApiHealth() }, [refreshApiHealth])

  const upload = useCallback(async (file: File, notificationsEnabled: boolean) => {
    setIsUploading(true)
    setUploadProgress(0)
    setError('')
    setNotice('')
    try {
      const uploaded = await requestUpload(file, setUploadProgress)
      setUploadProgress(100)
      setNotice(notificationsEnabled ? `Uploaded “${uploaded.filename}” successfully.` : '')
      logActivity(`Uploaded “${uploaded.filename}”.`)
      await loadDocuments()
      return true
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.')
      return false
    } finally {
      setIsUploading(false)
    }
  }, [loadDocuments, logActivity])

  const remove = useCallback(async (file: DocumentRecord, notificationsEnabled: boolean) => {
    if (!window.confirm(`Delete “${file.filename}”? This removes the file and its metadata.`)) return false
    setDeletingId(file.file_id)
    setError('')
    setNotice('')
    try {
      await requestDelete(file.file_id)
      setNotice(notificationsEnabled ? `Deleted “${file.filename}”.` : '')
      logActivity(`Deleted “${file.filename}”.`)
      await loadDocuments()
      return true
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Delete failed.')
      return false
    } finally {
      setDeletingId(null)
    }
  }, [loadDocuments, logActivity])

  const dismissMessages = useCallback(() => { setNotice(''); setError('') }, [])
  const setSuccessNotice = useCallback((message: string) => setNotice(message), [])

  return useMemo(() => ({
    documents, isLoading, isRefreshing, isUploading, uploadProgress, deletingId,
    error, notice, apiStatus, loadDocuments, refreshApiHealth, upload, remove,
    dismissMessages, setSuccessNotice,
  }), [
    documents, isLoading, isRefreshing, isUploading, uploadProgress, deletingId,
    error, notice, apiStatus, loadDocuments, refreshApiHealth, upload, remove,
    dismissMessages, setSuccessNotice,
  ])
}
