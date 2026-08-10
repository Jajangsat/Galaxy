import type { EndpointProfile, Conversation, Message, Preferences } from '../types'

const DB_NAME = 'galaxy-db'
const DB_VERSION = 1

const STORES = {
  endpoints: 'endpoints',
  conversations: 'conversations',
  messages: 'messages',
  preferences: 'preferences',
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains(STORES.endpoints)) {
        const store = db.createObjectStore(STORES.endpoints, { keyPath: 'id' })
        store.createIndex('updatedAt', 'updatedAt', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.conversations)) {
        const store = db.createObjectStore(STORES.conversations, { keyPath: 'id' })
        store.createIndex('endpointProfileId', 'endpointProfileId', { unique: false })
        store.createIndex('updatedAt', 'updatedAt', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.messages)) {
        const store = db.createObjectStore(STORES.messages, { keyPath: 'id' })
        store.createIndex('conversationId', 'conversationId', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }

      if (!db.objectStoreNames.contains(STORES.preferences)) {
        db.createObjectStore(STORES.preferences, { keyPath: 'key' })
      }
    }
  })
}

export async function getEndpoint(id: string): Promise<EndpointProfile | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.endpoints, 'readonly')
    const store = tx.objectStore(STORES.endpoints)
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getAllEndpoints(): Promise<EndpointProfile[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.endpoints, 'readonly')
    const store = tx.objectStore(STORES.endpoints)
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveEndpoint(endpoint: EndpointProfile): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.endpoints, 'readwrite')
    const store = tx.objectStore(STORES.endpoints)
    const request = store.put(endpoint)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function deleteEndpoint(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.endpoints, 'readwrite')
    const store = tx.objectStore(STORES.endpoints)
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.conversations, 'readonly')
    const store = tx.objectStore(STORES.conversations)
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getAllConversations(): Promise<Conversation[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.conversations, 'readonly')
    const store = tx.objectStore(STORES.conversations)
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveConversation(conversation: Conversation): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.conversations, 'readwrite')
    const store = tx.objectStore(STORES.conversations)
    const request = store.put(conversation)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.conversations, STORES.messages], 'readwrite')

    tx.objectStore(STORES.conversations).delete(id)

    const msgStore = tx.objectStore(STORES.messages)
    const index = msgStore.index('conversationId')
    const request = index.getAllKeys(IDBKeyRange.only(id))

    request.onsuccess = () => {
      const keys = request.result as string[]
      for (const key of keys) {
        msgStore.delete(key)
      }
    }

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.messages, 'readonly')
    const store = tx.objectStore(STORES.messages)
    const index = store.index('conversationId')
    const request = index.getAll(IDBKeyRange.only(conversationId))
    request.onsuccess = () => {
      const results = request.result as Message[]
      resolve(results.sort((a, b) => a.createdAt - b.createdAt))
    }
    request.onerror = () => reject(request.error)
  })
}

export async function saveMessage(message: Message): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.messages, 'readwrite')
    const store = tx.objectStore(STORES.messages)
    const request = store.put(message)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function deleteMessage(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.messages, 'readwrite')
    const store = tx.objectStore(STORES.messages)
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function getPreferences(): Promise<Preferences> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.preferences, 'readonly')
    const store = tx.objectStore(STORES.preferences)
    const request = store.getAll()
    request.onsuccess = () => {
      const items = request.result as { key: string; value: unknown }[]
      const prefs: Preferences = {
        theme: 'dark',
        accentColor: '#A7F46A',
      }
      for (const item of items) {
        if (item.key === 'activeEndpointId') prefs.activeEndpointId = item.value as string
        if (item.key === 'activeConversationId') prefs.activeConversationId = item.value as string
        if (item.key === 'theme') prefs.theme = item.value as Preferences['theme']
        if (item.key === 'accentColor') prefs.accentColor = item.value as string
      }
      resolve(prefs)
    }
    request.onerror = () => reject(request.error)
  })
}

export async function savePreference(key: string, value: unknown): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.preferences, 'readwrite')
    const store = tx.objectStore(STORES.preferences)
    const request = store.put({ key, value })
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function clearAllData(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      [STORES.endpoints, STORES.conversations, STORES.messages, STORES.preferences],
      'readwrite',
    )
    tx.objectStore(STORES.endpoints).clear()
    tx.objectStore(STORES.conversations).clear()
    tx.objectStore(STORES.messages).clear()
    tx.objectStore(STORES.preferences).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
