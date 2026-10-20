import { createContext, useContext, type ReactNode } from 'react'
import { useDocumentUI } from '../hooks/useDocumentUI'

type DocumentUIContextValue = ReturnType<typeof useDocumentUI>
const DocumentUIContext = createContext<DocumentUIContextValue | null>(null)

export function DocumentUIProvider({ children }: { children: ReactNode }) {
  const ui = useDocumentUI()
  return <DocumentUIContext.Provider value={ui}>{children}</DocumentUIContext.Provider>
}

export function useDocumentUIContext() {
  const context = useContext(DocumentUIContext)
  if (context === null) {
    throw new Error('useDocumentUIContext must be used inside DocumentUIProvider')
  }
  return context
}
