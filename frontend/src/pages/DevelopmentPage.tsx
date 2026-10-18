import { useAppContext } from '../app-context'
import { API_BASE_URL } from '../lib/config'

export function DevelopmentPage() {
  const { apiStatus, refreshApiHealth, loadDocuments } = useAppContext()
  const status = apiStatus === 'online' ? 'Online' : apiStatus === 'offline' ? 'Offline' : 'Checking'
  const statusClass = apiStatus === 'online' ? 'status-online' : apiStatus === 'offline' ? 'status-offline' : 'status-pending'
  return <div className="app-page">
    <div className="page-heading"><p className="eyebrow">ENVIRONMENT</p><h1>Local development</h1><p>Service endpoints and a live backend health check.</p></div>
    <div className="page-card service-list">
      <div className="service-row"><div><strong>React + Vite frontend</strong><span>http://localhost:5173</span></div><span className="status-pill status-online">Running in browser</span></div>
      <div className="service-row"><div><strong>FastAPI backend</strong><span>{API_BASE_URL}</span></div><span className={`status-pill ${statusClass}`}>{status}</span></div>
      <div className="service-row"><div><strong>PostgreSQL</strong><span>Stores document metadata (accessed through FastAPI)</span></div><span className="status-pill status-info">Backend managed</span></div>
      <div className="service-row"><div><strong>SeaweedFS</strong><span>Stores the actual uploaded file content</span></div><span className="status-pill status-info">Backend managed</span></div>
      <div className="development-actions"><button className="primary-button" type="button" onClick={() => void refreshApiHealth()}>Run health check</button>
        <button className="secondary-button" type="button" onClick={() => void loadDocuments(true)}>Refresh document data</button>
        <a className="secondary-link" href={`${API_BASE_URL}/docs`} target="_blank" rel="noreferrer">Open API docs ↗</a></div>
    </div>
  </div>
}
