import { useDocumentData } from '../features/documents/context/DocumentDataContext'
import { useAppNavigation } from '../app/navigation'
import { API_BASE_URL } from '../lib/config'

export function ProfilePage() {
  const { documents } = useDocumentData()
  const { openPage } = useAppNavigation()
  return <div className="app-page">
    <div className="page-heading"><p className="eyebrow">LOCAL PROFILE</p><h1>Local user</h1><p>This application runs locally and does not have sign-in or account management.</p></div>
    <div className="page-card profile-card"><div className="profile-avatar">L</div>
      <div className="profile-main"><h2>Local user</h2><p>LocalDocs workspace</p><span className="status-pill status-info">No account connected</span></div>
      <div className="profile-detail"><span>Workspace</span><strong>Local development</strong></div>
      <div className="profile-detail"><span>API endpoint</span><strong>{API_BASE_URL}</strong></div>
      <div className="profile-detail"><span>Documents available</span><strong>{documents.length}</strong></div>
      <button className="primary-button" type="button" onClick={() => openPage('settings')}>Manage interface settings</button>
    </div>
  </div>
}
