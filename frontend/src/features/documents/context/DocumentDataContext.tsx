import { createContext, useContext, type ReactNode } from 'react'
import { useDocuments } from '../hooks/useDocuments'
import { useActivityContext } from '../../activity/context/ActivityContext'

type DocumentDataContextValue = ReturnType<typeof useDocuments>
const DocumentDataContext = createContext<DocumentDataContextValue | null>(null)

export function DocumentDataProvider({ children }: { children: ReactNode }) {
  const { logActivity } = useActivityContext()
  const documentState = useDocuments(logActivity)

  return (
    <DocumentDataContext.Provider value={documentState}>
      {children}
    </DocumentDataContext.Provider>
  )
}

export function useDocumentData() {
  const context = useContext(DocumentDataContext)
  if (context === null) {
    throw new Error('useDocumentData must be used inside DocumentDataProvider')
  }
  return context
}
