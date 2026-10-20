import { useActivityContext } from '../features/activity/context/ActivityContext'
import { useAppNavigation } from '../app/navigation'
import { EmptyState } from '../components/common/EmptyState'
import { formatDate } from '../lib/format'

export function ActivityPage() {
  const { activity } = useActivityContext()
  const { openPage } = useAppNavigation()
  return <div className="app-page">
    <div className="page-heading"><p className="eyebrow">LOCAL SESSION</p><h1>Activity</h1><p>Actions performed during this open browser session.</p></div>
    {activity.length ? <div className="page-card">{activity.map((item) => <div className="activity-row" key={item.id}>
      <span className="activity-dot" /><div><strong>{item.message}</strong><span>{formatDate(item.at)}</span></div>
    </div>)}</div> : <EmptyState title="No activity yet" description="Uploads, deletions, and manual refreshes will appear here while this page remains open." action="Go to Documents" onAction={() => openPage('documents')} />}
  </div>
}
