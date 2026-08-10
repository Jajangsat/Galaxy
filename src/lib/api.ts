import { ModelInfo, StreamEvent } from '../types'
import { normalizeEndpointUrl } from './endpoint'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  baseUrl: string
  apiKey: string
  model: string
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
  onEvent: (event: StreamEvent) => void
}

export async function fetchModels(baseUrl: string, apiKey: string): Promise<ModelInfo[]> {
  const normalized = normalizeEndpointUrl(baseUrl)
  const url = `${normalized}/models`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}${text ? ' — ' + text.slice(0, 200) : ''}`)
  }

  const data = await response.json()

  if (!data.data || !Array.isArray(data.data)) {
    throw new Error('Invalid response format: expected { data: ModelInfo[] }')
  }

  return data.data.map((m: Record<string, unknown>) => ({
    id: String(m.id ?? ''),
    name: m.name as string | undefined,
    created: m.created as number | undefined,
    ownedBy: m.owned_by as string | undefined,
  }))
}

export async function chatCompletion(options: ChatOptions): Promise<void> {
  const { baseUrl, apiKey, model, messages, temperature, maxTokens, signal, onEvent } = options
  const normalized = normalizeEndpointUrl(baseUrl)
  const url = `${normalized}/chat/completions`

  const body: Record<string, unknown> = {
    model,
    messages,
    stream: true,
  }

  if (temperature !== undefined) body.temperature = temperature
  if (maxTokens !== undefined) body.max_tokens = maxTokens

  let response: Response

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal,
    })
  } catch (err) {
    if (signal?.aborted) return
    onEvent({
      type: 'error',
      error: err instanceof Error ? err.message : 'Network error',
    })
    return
  }

  if (!response.ok) {
    let errorText = ''
    try {
      const data = await response.json()
      errorText = data.error?.message || JSON.stringify(data)
    } catch {
      errorText = await response.text().catch(() => '')
    }

    let errorMessage = `HTTP ${response.status}: ${errorText || response.statusText}`

    if (response.status === 401 || response.status === 403) {
      errorMessage = 'API key rejected or insufficient permissions'
    } else if (response.status === 429) {
      errorMessage = 'Rate limit exceeded or insufficient credits'
    }

    onEvent({ type: 'error', error: errorMessage })
    return
  }

  if (!response.body) {
    onEvent({ type: 'error', error: 'No response body' })
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data:')) continue

        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') {
          onEvent({ type: 'done' })
          return
        }

        try {
          const parsed = JSON.parse(data)
          const delta = parsed.choices?.[0]?.delta
          if (delta?.content) {
            onEvent({ type: 'token', content: delta.content })
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }
  } catch (err) {
    if (signal?.aborted) return
    onEvent({
      type: 'error',
      error: err instanceof Error ? err.message : 'Stream error',
    })
    return
  }

  onEvent({ type: 'done' })
}
