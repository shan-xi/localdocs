import type { Page } from '../../types/document'

type Props = { page: Page; onNavigate: (page: Page) => void }

function NavButton({ label, symbol, active, onClick }: { label: string; symbol: string; active: boolean; onClick: () => void }) {
  return <button type="button" className={`side-nav-item ${active ? 'active' : ''}`} aria-label={label} title={label} onClick={onClick}>
    <span aria-hidden="true">{symbol}</span><span className="nav-tooltip-label">{label}</span>
  </button>
}

export function Sidebar({ page, onNavigate }: Props) {
  return <aside className="sidebar" aria-label="Main navigation">
    <button className="sidebar-brand" type="button" onClick={() => onNavigate('dashboard')} aria-label="LocalDocs home"><span>LD</span></button>
    <nav className="side-nav">
      <NavButton label="Documents" symbol="▤" active={page === 'documents'} onClick={() => onNavigate('documents')} />
      <NavButton label="Dashboard" symbol="▦" active={page === 'dashboard'} onClick={() => onNavigate('dashboard')} />
      <NavButton label="Activity" symbol="✳" active={page === 'activity'} onClick={() => onNavigate('activity')} />
      <NavButton label="Shared files" symbol="◌" active={page === 'shared'} onClick={() => onNavigate('shared')} />
      <NavButton label="Recent" symbol="◷" active={page === 'recent'} onClick={() => onNavigate('recent')} />
    </nav>
    <div className="side-bottom">
      <NavButton label="Settings" symbol="⚙" active={page === 'settings'} onClick={() => onNavigate('settings')} />
      <NavButton label="Local development" symbol="⌘" active={page === 'development'} onClick={() => onNavigate('development')} />
    </div>
  </aside>
}
