import { useState, useRef, useEffect } from 'react'
import { chatCompletion, ChatMessage } from '../lib/api'
import { saveMessage, getMessages } from '../lib/db'
import type { Message, EndpointProfile } from '../types'

interface ChatWorkspaceProps {
  endpoint: EndpointProfile
  conversationId: string
  onBack: () => void
}

export default function ChatWorkspace({ endpoint, conversationId, onBack }: ChatWorkspaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    getMessages(conversationId).then(setMessages)
  }, [conversationId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px'
    }
  }, [input])

  const sendMessage = async () => {
    const content = input.trim()
    if (!content || loading) return

    const userMsg: Message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      conversationId,
      role: 'user',
      content,
      createdAt: Date.now(),
    }

    const assistantMsg: Message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      conversationId,
      role: 'assistant',
      content: '',
      model: endpoint.defaultModel,
      createdAt: Date.now(),
    }

    setMessages(prev => [...prev, userMsg])
    setMessages(prev => [...prev, assistantMsg])
    setInput('')
    setLoading(true)

    const controller = new AbortController()
    setAbortController(controller)

    const chatMessages: ChatMessage[] = messages
      .concat(userMsg)
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    try {
      await saveMessage(userMsg)

      let accumulated = ''

      await chatCompletion({
        baseUrl: endpoint.baseUrl,
        apiKey: endpoint.apiKey,
        model: endpoint.defaultModel || 'gpt-4o-mini',
        messages: chatMessages,
        signal: controller.signal,
        onEvent: async (event) => {
          if (event.type === 'token' && event.content) {
            accumulated += event.content
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMsg.id ? { ...m, content: accumulated } : m
              )
            )
          } else if (event.type === 'done') {
            await saveMessage({ ...assistantMsg, content: accumulated })
            setLoading(false)
            setAbortController(null)
          } else if (event.type === 'error') {
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMsg.id
                  ? { ...m, content: `⚠ Error: ${event.error}` }
                  : m
              )
            )
            setLoading(false)
            setAbortController(null)
          }
        },
      })
    } catch (err) {
      if (controller.signal.aborted) return
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsg.id
            ? { ...m, content: `⚠ Network error: ${err instanceof Error ? err.message : String(err)}` }
            : m
        )
      )
      setLoading(false)
      setAbortController(null)
    }
  }

  const stopGeneration = () => {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const renderContent = (content: string) => {
    // Simple markdown-like rendering
    const parts = content.split(/(```[\s\S]*?```)/g)
    return parts.map((part, i) => {
      if (part.startsWith('```')) {
        const match = part.match(/^```(\w*)\n?([\s\S]*?)```$/)
        const lang = match?.[1] || ''
        const code = match?.[2] || part.slice(3, -3)
        return (
          <pre key={i} style={{ background: 'var(--color-bg)', padding: 12, borderRadius: 6, overflow: 'auto', margin: '8px 0' }}>
            {lang && <span className="text-xs text-muted mono" style={{ display: 'block', marginBottom: 6 }}>{lang}</span>}
            <code className="mono text-sm">{code}</code>
          </pre>
        )
      }
      // Split inline code
      const segments = part.split(/(`[^`]+`)/g)
      return segments.map((seg, j) => {
        if (seg.startsWith('`') && seg.endsWith('`')) {
          return <code key={j} className="mono" style={{ background: 'var(--color-hover)', padding: '1px 4px', borderRadius: 3, fontSize: 13 }}>{seg.slice(1, -1)}</code>
        }
        return <span key={j}>{seg}</span>
      })
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1 }}>
      {/* Top bar */}
      <div style={{
        height: 48,
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
        flexShrink: 0,
      }}>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onBack} aria-label="Back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="dot dot-green" />
          <span className="mono text-sm">{endpoint.name}</span>
          <span className="text-muted">/</span>
          <span className="mono text-sm">{endpoint.defaultModel || 'model'}</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12h8M8 15h5" />
            </svg>
            <p className="text-secondary">Start a conversation with {endpoint.name}</p>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              marginBottom: 20,
              maxWidth: msg.role === 'user' ? '85%' : '100%',
              marginLeft: msg.role === 'user' ? 'auto' : 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className={`badge ${msg.role === 'user' ? 'badge-info' : 'badge-success'}`}>
                {msg.role === 'user' ? '> user' : '> assistant'}
              </span>
              {msg.model && <span className="text-xs mono text-muted">{msg.model}</span>}
              <span className="text-xs text-muted">
                {new Date(msg.createdAt).toLocaleTimeString()}
              </span>
            </div>
            <div
              style={{
                padding: '10px 14px',
                background: msg.role === 'user' ? 'var(--color-hover)' : 'transparent',
                border: msg.role === 'user' ? '1px solid var(--color-border)' : 'none',
                borderLeft: msg.role !== 'user' ? '2px solid var(--color-accent)' : 'none',
                borderRadius: msg.role === 'user' ? 'var(--radius-md)' : 0,
                lineHeight: 1.7,
                fontSize: 14,
              }}
            >
              {renderContent(msg.content)}
              {msg.role === 'assistant' && loading && messages[messages.length - 1].id === msg.id && msg.content === '' && (
                <span className="cursor-blink" />
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div style={{
        borderTop: '1px solid var(--color-border)',
        padding: '12px 16px',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
          maxWidth: 920,
          margin: '0 auto',
        }}>
          <textarea
            ref={textareaRef}
            className="input"
            style={{
              flex: 1,
              minHeight: 36,
              maxHeight: 160,
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.6,
              padding: '8px 12px',
            }}
            placeholder="Ask .Galaxy..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          {loading ? (
            <button className="btn btn-ghost" onClick={stopGeneration} style={{ color: 'var(--color-error)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              Stop
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={sendMessage}
              disabled={!input.trim()}
              aria-label="Send message"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          )}
        </div>
        <div style={{ textAlign: 'center', marginTop: 6 }}>
          <span className="text-xs text-muted mono">
            {endpoint.name} · {endpoint.defaultModel} · Enter to send, Shift+Enter for new line
          </span>
        </div>
      </div>
    </div>
  )
}
