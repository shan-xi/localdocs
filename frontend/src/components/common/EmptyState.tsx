type EmptyStateProps = {
  title: string
  description: string
  action: string
  onAction: () => void
}

export function EmptyState({ title, description, action, onAction }: EmptyStateProps) {
  return <div className="page-card empty-state">
    <span className="empty-state-icon">◇</span>
    <h2>{title}</h2>
    <p>{description}</p>
    <button className="primary-button" type="button" onClick={onAction}>{action}</button>
  </div>
}
