import { useDocumentData } from '../../features/documents/context/DocumentDataContext'
import { useDocumentUIContext } from '../../features/documents/context/DocumentUIContext'
import { useNotificationSettings } from '../../features/settings/context/NotificationContext'
import { useAppNavigation } from '../../app/navigation'

export function Toolbar() {
  const { page, openPage } = useAppNavigation()
  const { search, setSearch, view, setView } = useDocumentUIContext()
  const { loadDocuments, isRefreshing, notice, error, setSuccessNotice } = useDocumentData()
  const { notificationsEnabled } = useNotificationSettings()

  return <header className="toolbar">
    <label className="search-box"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => {
      setSearch(event.target.value)
      if (page !== 'documents') openPage('documents')
    }} placeholder="Find Documents" aria-label="Find documents" /></label>
    <div className="view-switch"><span>View:</span>
      <button type="button" className={view === 'grid' ? 'selected' : ''} onClick={() => setView('grid')}>▦ <span>Grid</span></button>
      <button type="button" className={view === 'list' ? 'selected' : ''} onClick={() => setView('list')}>☷ <span>List</span></button>
    </div>
    <div className="toolbar-spacer" />
    <button className="toolbar-icon" type="button" title="Refresh documents" aria-label="Refresh documents" onClick={() => {
      void loadDocuments(true)
      if (notificationsEnabled) setSuccessNotice('Document list refresh requested.')
    }} disabled={isRefreshing}>↻</button>
    <button className={`toolbar-icon notification-icon ${page === 'notifications' ? 'toolbar-active' : ''}`} type="button"
      aria-label="Notifications" title="Notifications" onClick={() => openPage('notifications')}>
      ♧{notificationsEnabled && (notice || error) && <span className="notification-dot" />}
    </button>
    <button className={`avatar ${page === 'profile' ? 'avatar-active' : ''}`} type="button" aria-label="Local user profile"
      title="Local user" onClick={() => openPage('profile')}>L</button>
  </header>
}
