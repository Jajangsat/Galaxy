import { useState, useEffect, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import ChatWorkspace from './components/ChatWorkspace'
import ConnectionDialog from './components/ConnectionDialog'
import { getAllEndpoints, getPreferences, savePreference, getAllConversations, saveConversation, clearAllData, deleteEndpoint } from './lib/db'
import type { EndpointProfile, Conversation, Preferences } from './types'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function App() {
  const [endpoints, setEndpoints] = useState<EndpointProfile[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [_preferences, setPreferences] = useState<Preferences>({ theme: 'dark', accentColor: '#A7F46A' })
  const [_prefsLoaded, setPrefsLoaded] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showConnectionDialog, setShowConnectionDialog] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [activeEndpoint, setActiveEndpoint] = useState<EndpointProfile | null>(null)
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [eps, convos, prefs] = await Promise.all([
        getAllEndpoints(),
        getAllConversations(),
        getPreferences(),
      ])
      setEndpoints(eps)
      setConversations(convos)
      setPreferences(prefs)
      setPrefsLoaded(true)

      if (prefs.activeEndpointId) {
        const ep = eps.find((e: EndpointProfile) => e.id === prefs.activeEndpointId)
        if (ep) setActiveEndpoint(ep)
      }

      if (prefs.activeConversationId) {
        const conv = convos.find((c: Conversation) => c.id === prefs.activeConversationId)
        if (conv) setActiveConversation(conv)
      }
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleConnected = useCallback((endpoint: EndpointProfile) => {
    setActiveEndpoint(endpoint)
    setShowConnectionDialog(false)
    loadData()
  }, [loadData])

  const handleNewChat = useCallback(async () => {
    if (!activeEndpoint) {
      setShowConnectionDialog(true)
      return
    }

    const conv: Conversation = {
      id: generateId(),
      title: 'New conversation',
      endpointProfileId: activeEndpoint.id,
      model: activeEndpoint.defaultModel || '',
      temperature: 0.7,
      maxTokens: 2048,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    await saveConversation(conv)
    setActiveConversation(conv)
    await savePreference('activeConversationId', conv.id)
    loadData()
  }, [activeEndpoint, loadData])

  const handleSelectConversation = useCallback(async (id: string) => {
    const conv = conversations.find(c => c.id === id)
    if (conv) {
      setActiveConversation(conv)
      await savePreference('activeConversationId', id)
    }
  }, [conversations])

  const handleSelectEndpoint = useCallback(async (id: string) => {
    const ep = endpoints.find(e => e.id === id)
    if (ep) {
      setActiveEndpoint(ep)
      await savePreference('activeEndpointId', id)
    }
  }, [endpoints])

  const handleClearAllData = useCallback(async () => {
    if (confirm('Clear all local data? This will delete all endpoints, conversations, and settings.')) {
      await clearAllData()
      setActiveEndpoint(null)
      setActiveConversation(null)
      setEndpoints([])
      setConversations([])
      setPreferences({ theme: 'dark', accentColor: '#A7F46A' })
    }
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-bg)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 32, height: 32, border: `2px solid var(--color-border)`, borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <span className="text-sm text-secondary">Loading .Galaxy...</span>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <Sidebar
        endpoints={endpoints}
        conversations={conversations}
        activeEndpointId={activeEndpoint?.id}
        activeConversationId={activeConversation?.id}
        onSelectEndpoint={handleSelectEndpoint}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onOpenSettings={() => setShowSettings(true)}
        onToggleSidebar={() => setSidebarOpen(v => !v)}
        isOpen={sidebarOpen}
      />

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {activeEndpoint && activeConversation ? (
          <ChatWorkspace
            endpoint={activeEndpoint}
            conversationId={activeConversation.id}
            onBack={handleNewChat}
          />
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
                <span style={{ color: 'var(--color-accent)' }}>.</span>Galaxy
              </h1>
              <p className="text-secondary" style={{ fontSize: 15, marginBottom: 8 }}>
                One workspace for every model
              </p>
              <p className="text-muted text-sm">
                Connect an OpenAI-compatible endpoint to get started
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 500 }}>
              <div style={{ padding: 12, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', maxWidth: 220 }}>
                <div className="label">Features</div>
                <ul style={{ paddingLeft: 16, lineHeight: 1.8, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  <li>Auto-detect models</li>
                  <li>Streaming responses</li>
                  <li>Local-first storage</li>
                  <li>Multi-endpoint support</li>
                  <li>Keyboard shortcuts</li>
                </ul>
              </div>
              <div style={{ padding: 12, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', maxWidth: 220 }}>
                <div className="label">Security</div>
                <ul style={{ paddingLeft: 16, lineHeight: 1.8, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  <li>API keys stay local</li>
                  <li>No backend server</li>
                  <li>No analytics</li>
                  <li>IndexedDB storage</li>
                  <li>Clear all data option</li>
                </ul>
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ marginTop: 8, minWidth: 200 }}
              onClick={() => setShowConnectionDialog(true)}
            >
              Connect Endpoint →
            </button>

            {endpoints.length > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  if (endpoints[0]) handleSelectEndpoint(endpoints[0].id)
                }}
              >
                Continue with {endpoints[0].name}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Connection Dialog */}
      {showConnectionDialog && (
        <ConnectionDialog
          onConnected={handleConnected}
          onClose={() => setShowConnectionDialog(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Settings">
          <div className="modal">
            <div className="modal-header">
              <h2>Settings</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowSettings(false)} aria-label="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 20 }}>
                <div className="label">ENDPOINTS</div>
                {endpoints.map(ep => (
                  <div key={ep.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <div>
                      <div className="mono text-sm">{ep.name}</div>
                      <div className="text-xs text-muted mono">{ep.baseUrl}</div>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--color-error)' }}
                      onClick={async () => {
                        if (confirm(`Delete endpoint "${ep.name}"?`)) {
                          await deleteEndpoint(ep.id)
                          if (activeEndpoint?.id === ep.id) setActiveEndpoint(null)
                          loadData()
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
                {endpoints.length === 0 && (
                  <p className="text-sm text-muted">No endpoints configured</p>
                )}
              </div>

              <div style={{ marginBottom: 20 }}>
                <div className="label">DATA</div>
                <p className="text-sm text-secondary" style={{ marginBottom: 12 }}>
                  All data is stored locally in your browser using IndexedDB.
                </p>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--color-error)' }}
                  onClick={handleClearAllData}
                >
                  Clear all local data
                </button>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div className="label">ABOUT</div>
                <p className="text-sm text-secondary">
                  .Galaxy v0.1.0 — local-first AI chat workspace
                </p>
                <p className="text-xs text-muted mono" style={{ marginTop: 4 }}>
                  Your API keys never leave this browser.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-primary"
                onClick={() => setShowConnectionDialog(true)}
              >
                + Add Endpoint
              </button>
              <button className="btn btn-ghost" onClick={() => setShowSettings(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
