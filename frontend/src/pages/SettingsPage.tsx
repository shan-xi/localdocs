import { useDocumentUIContext } from '../features/documents/context/DocumentUIContext'
import { useNotificationSettings } from '../features/settings/context/NotificationContext'

export function SettingsPage() {
  const { view, setView, pageSize, setPageSize } = useDocumentUIContext()
  const { notificationsEnabled, setNotificationsEnabled } = useNotificationSettings()
  return <div className="app-page">
    <div className="page-heading"><p className="eyebrow">PREFERENCES</p><h1>Settings</h1><p>Adjust how the LocalDocs interface behaves in this session.</p></div>
    <div className="page-card settings-card">
      <div className="setting-row"><div><strong>Default document view</strong><span>Choose how the document list is displayed.</span></div>
        <select aria-label="Default document view" value={view} onChange={(event) => setView(event.target.value as 'list' | 'grid')}><option value="list">List</option><option value="grid">Grid</option></select></div>
      <div className="setting-row"><div><strong>Rows per page</strong><span>Number of document records shown on each page.</span></div>
        <select aria-label="Default rows per page" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}><option value={5}>5 rows</option><option value={10}>10 rows</option><option value={20}>20 rows</option><option value={50}>50 rows</option></select></div>
      <div className="setting-row"><div><strong>In-app notifications</strong><span>Show success messages after file operations.</span></div>
        <button className={`toggle-button ${notificationsEnabled ? 'toggle-on' : ''}`} type="button" role="switch" aria-checked={notificationsEnabled} onClick={() => setNotificationsEnabled((enabled) => !enabled)}>{notificationsEnabled ? 'On' : 'Off'}</button></div>
      <p className="settings-footnote">These are frontend preferences for the current session; they are not saved to a user account or database.</p>
    </div>
  </div>
}
