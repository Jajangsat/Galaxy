import { useState, useCallback } from 'react'
import { fetchModels } from '../lib/api'
import { normalizeEndpointUrl } from '../lib/endpoint'
import { saveEndpoint, savePreference } from '../lib/db'
import type { EndpointProfile, ModelInfo } from '../types'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function maskKey(key: string): string {
  if (key.length <= 8) return '••••••••'
  return '••••••••' + key.slice(-4)
}

interface ConnectionStep {
  step: 'connect' | 'models' | 'done'
}

export default function ConnectionDialog({
  onConnected,
  onClose,
  initialEndpoint,
}: {
  onConnected: (endpoint: EndpointProfile) => void
  onClose: () => void
  initialEndpoint?: EndpointProfile
}) {
  const [step, setStep] = useState<ConnectionStep['step']>(initialEndpoint ? 'models' : 'connect')
  const [baseUrl, setBaseUrl] = useState(initialEndpoint?.baseUrl ?? '')
  const [apiKey, setApiKey] = useState(initialEndpoint?.apiKey ?? '')
  const [showKey, setShowKey] = useState(false)
  const [remember, setRemember] = useState(true)
  const [models, setModels] = useState<ModelInfo[]>([])
  const [selectedModel, setSelectedModel] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hostname, setHostname] = useState('')

  const handleConnect = useCallback(async () => {
    if (!baseUrl.trim()) {
      setError('Base URL is required')
      return
    }

    if (!apiKey.trim()) {
      setError('API Key is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const normalized = normalizeEndpointUrl(baseUrl)
      const urlObj = new URL(normalized)
      setHostname(urlObj.hostname)

      const fetchedModels = await fetchModels(normalized, apiKey)
      setModels(fetchedModels)
      setStep('models')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
    } finally {
      setLoading(false)
    }
  }, [baseUrl, apiKey])

  const handleFinish = useCallback(async () => {
    if (!selectedModel) return

    setLoading(true)
    setError('')

    const normalized = normalizeEndpointUrl(baseUrl)
    const profile: EndpointProfile = {
      id: initialEndpoint?.id ?? generateId(),
      name: initialEndpoint?.name ?? (hostname.split('.')[0] || 'Endpoint'),
      baseUrl: normalized,
      apiKey: apiKey,
      defaultModel: selectedModel,
      createdAt: initialEndpoint?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    }

    try {
      await saveEndpoint(profile)
      if (remember) {
        await savePreference('activeEndpointId', profile.id)
      }
      onConnected(profile)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }, [baseUrl, apiKey, selectedModel, remember, hostname, initialEndpoint, onConnected])

  const filteredModels = models.filter(m =>
    m.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Connect endpoint">
      <div className="modal">
        <div className="modal-header">
          <h2>
            {step === 'connect' && 'Connect Endpoint'}
            {step === 'models' && 'Select Model'}
            {step === 'done' && 'Connected'}
          </h2>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {step === 'connect' && (
            <>
              <p className="text-sm text-secondary" style={{ marginBottom: 20 }}>
                Enter your OpenAI-compatible endpoint. Your API key stays in this browser.
              </p>

              <div style={{ marginBottom: 16 }}>
                <label className="label" htmlFor="base-url">Base URL</label>
                <input
                  id="base-url"
                  type="url"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="https://api.example.com/v1"
                  value={baseUrl}
                  onChange={e => setBaseUrl(e.target.value)}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="label" htmlFor="api-key">API Key</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    id="api-key"
                    type={showKey ? 'text' : 'password'}
                    className="input"
                    style={{ flex: 1 }}
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                  />
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    onClick={() => setShowKey(v => !v)}
                    aria-label={showKey ? 'Hide API key' : 'Show API key'}
                  >
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                </div>
                {apiKey && (
                  <p className="text-xs mono text-muted" style={{ marginTop: 4 }}>
                    {maskKey(apiKey)}
                  </p>
                )}
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.value === 'on')}
                />
                <span className="text-sm text-secondary">Remember on this device</span>
              </label>

              {hostname && (
                <p className="text-xs text-muted" style={{ marginBottom: 12 }}>
                  Credentials will be sent to: <span className="mono">{hostname}</span>
                </p>
              )}

              {error && (
                <div className="badge badge-error" style={{ marginBottom: 12, display: 'inline-flex' }}>
                  <span className="dot dot-red" />
                  {error}
                </div>
              )}
            </>
          )}

          {step === 'models' && (
            <>
              <p className="text-sm text-secondary" style={{ marginBottom: 12 }}>
                <span className="badge badge-success" style={{ marginRight: 8 }}>
                  <span className="dot dot-green" />
                  Connected
                </span>
                {models.length} model{models.length !== 1 ? 's' : ''} detected
              </p>

              <div style={{ marginBottom: 12 }}>
                <input
                  type="text"
                  className="input input-sm"
                  style={{ width: '100%' }}
                  placeholder="Search models..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>

              <div
                style={{
                  maxHeight: 300,
                  overflowY: 'auto',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                {filteredModels.length === 0 ? (
                  <p className="text-sm text-muted" style={{ padding: 24, textAlign: 'center' }}>
                    No models found
                  </p>
                ) : (
                  filteredModels.map(model => (
                    <button
                      key={model.id}
                      className={`btn btn-ghost ${selectedModel === model.id ? '' : ''}`}
                      style={{
                        width: '100%',
                        justifyContent: 'flex-start',
                        borderRadius: 0,
                        borderBottom: `1px solid var(--color-border)`,
                        background: selectedModel === model.id ? 'var(--color-hover)' : 'transparent',
                        borderLeft: selectedModel === model.id ? `2px solid var(--color-accent)` : '2px solid transparent',
                        height: 40,
                      }}
                      onClick={() => setSelectedModel(model.id)}
                    >
                      <span className="mono text-sm truncate">{model.id}</span>
                    </button>
                  ))
                )}
              </div>

              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setStep('connect')}
                >
                  ← Back
                </button>
                <span className="text-xs text-muted mono">
                  {hostname}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          {step === 'connect' && (
            <button
              className="btn btn-primary"
              onClick={handleConnect}
              disabled={loading}
              style={{ minWidth: 120 }}
            >
              {loading ? 'Connecting...' : 'Connect →'}
            </button>
          )}

          {step === 'models' && (
            <>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setStep('connect')}
              >
                ← Back
              </button>
              <button
                className="btn btn-primary"
                onClick={handleFinish}
                disabled={!selectedModel || loading}
                style={{ minWidth: 140 }}
              >
                {loading ? 'Saving...' : 'Start Chatting →'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
