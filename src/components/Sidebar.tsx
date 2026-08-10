import type { EndpointProfile, Conversation } from '../types'

interface SidebarProps {
  endpoints: EndpointProfile[]
  conversations: Conversation[]
  activeEndpointId?: string
  activeConversationId?: string
  onSelectEndpoint: (id: string) => void
  onSelectConversation: (id: string) => void
  onNewChat: () => void
  onOpenSettings: () => void
  onToggleSidebar: () => void
  isOpen: boolean
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function groupConversations(conversations: Conversation[]): { label: string; items: Conversation[] }[] {
  const now = Date.now()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const lastWeek = new Date(today)
  lastWeek.setDate(lastWeek.getDate() - 7)

  const groups: { label: string; items: Conversation[] }[] = []
  const todayConvos: Conversation[] = []
  const yesterdayConvos: Conversation[] = []
  const olderConvos: Conversation[] = []

  for (const c of conversations) {
    if (c.updatedAt >= today.getTime()) todayConvos.push(c)
    else if (c.updatedAt >= yesterday.getTime()) yesterdayConvos.push(c)
    else olderConvos.push(c)
  }

  if (todayConvos.length) groups.push({ label: 'TODAY', items: todayConvos })
  if (yesterdayConvos.length) groups.push({ label: 'YESTERDAY', items: yesterdayConvos })
  if (olderConvos.length) groups.push({ label: 'PREVIOUS', items: olderConvos })

  return groups
}

export default function Sidebar({
  endpoints,
  conversations,
  activeEndpointId,
  activeConversationId,
  onSelectEndpoint,
  onSelectConversation,
  onNewChat,
  onOpenSettings,
  onToggleSidebar,
  isOpen,
}: SidebarProps) {
  const groups = groupConversations(conversations.sort((a, b) => b.updatedAt - a.updatedAt))

  if (!isOpen) {
    return (
      <button
        className="btn btn-ghost btn-icon"
        onClick={onToggleSidebar}
        style={{ height: 48, width: 48, borderRadius: 0, borderRight: '1px solid var(--color-border)' }}
        aria-label="Open sidebar"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    )
  }

  return (
    <aside style={{
      width: 260,
      minWidth: 260,
      height: '100%',
      background: 'var(--color-sidebar)',
      borderRight: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        height: 48,
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 8,
        flexShrink: 0,
      }}>
        <button
          className="btn btn-ghost btn-icon btn-sm"
          onClick={onToggleSidebar}
          aria-label="Close sidebar"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span style={{ fontFamily: 'var(--font-brand)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>
          <span style={{ color: 'var(--color-accent)' }}>.</span>Galaxy
        </span>
      </div>

      {/* New Chat */}
      <div style={{ padding: '0 12px 8px', flexShrink: 0 }}>
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={onNewChat}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New chat
        </button>
      </div>

      {/* Conversations */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
        {groups.map(group => (
          <div key={group.label}>
            <div className="label" style={{ padding: '8px 4px 4px', fontSize: 10 }}>
              {group.label}
            </div>
            {group.items.map(conv => (
              <button
                key={conv.id}
                className="btn btn-ghost"
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  borderRadius: 0,
                  borderBottom: '1px solid transparent',
                  background: activeConversationId === conv.id ? 'var(--color-hover)' : 'transparent',
                  borderLeft: activeConversationId === conv.id ? `2px solid var(--color-accent)` : '2px solid transparent',
                  height: 36,
                  padding: '0 8px',
                }}
                onClick={() => onSelectConversation(conv.id)}
              >
                <span className="truncate text-sm" style={{ flex: 1, textAlign: 'left' }}>
                  {conv.title || 'Untitled'}
                </span>
                <span className="text-xs text-muted mono" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                  {timeAgo(conv.updatedAt)}
                </span>
              </button>
            ))}
          </div>
        ))}

        {conversations.length === 0 && (
          <p className="text-xs text-muted" style={{ padding: '16px 4px' }}>
            No conversations yet
          </p>
        )}
      </div>

      {/* Endpoints */}
      <div style={{ borderTop: '1px solid var(--color-border)', padding: '8px 12px', flexShrink: 0 }}>
        <div className="label" style={{ marginBottom: 6 }}>ENDPOINTS</div>
        {endpoints.map(ep => (
          <button
            key={ep.id}
            className="btn btn-ghost btn-sm"
            style={{
              width: '100%',
              justifyContent: 'flex-start',
              borderRadius: 0,
              background: activeEndpointId === ep.id ? 'var(--color-hover)' : 'transparent',
              height: 32,
              padding: '0 8px',
            }}
            onClick={() => onSelectEndpoint(ep.id)}
          >
            <span className={`dot ${activeEndpointId === ep.id ? 'dot-green' : 'dot-yellow'}`} />
            <span className="truncate mono text-xs" style={{ flex: 1, textAlign: 'left', marginLeft: 6 }}>
              {ep.name}
            </span>
          </button>
        ))}
      </div>

      {/* Settings */}
      <div style={{ borderTop: '1px solid var(--color-border)', padding: '8px 12px', flexShrink: 0 }}>
        <button
          className="btn btn-ghost btn-sm"
          style={{ width: '100%', justifyContent: 'flex-start' }}
          onClick={onOpenSettings}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          Settings
        </button>
      </div>
    </aside>
  )
}
