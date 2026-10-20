import { useAppNavigation } from '../app/navigation'
import { EmptyState } from '../components/common/EmptyState'

export function SharedPage() {
  const { openPage } = useAppNavigation()
  return <div className="app-page">
    <div className="page-heading"><p className="eyebrow">COLLABORATION</p><h1>Shared files</h1><p>Files shared with other users.</p></div>
    <EmptyState title="File sharing is not enabled" description="This local learning project currently supports personal file upload, preview, download, and deletion. It has no sharing API or user-permission model yet, so there are no shared files to display." action="Back to Documents" onAction={() => openPage('documents')} />
  </div>
}
