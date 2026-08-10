export interface EndpointProfile {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  defaultModel?: string
  createdAt: number
  updatedAt: number
}

export interface Conversation {
  id: string
  title: string
  endpointProfileId: string
  model: string
  systemPrompt?: string
  temperature: number
  maxTokens: number
  createdAt: number
  updatedAt: number
}

export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  model?: string
  createdAt: number
}

export interface Preferences {
  activeEndpointId?: string
  activeConversationId?: string
  theme: 'dark' | 'light'
  accentColor: string
}

export interface ModelInfo {
  id: string
  name?: string
  created?: number
  ownedBy?: string
}

export interface StreamEvent {
  type: 'token' | 'done' | 'error'
  content?: string
  error?: string
}
