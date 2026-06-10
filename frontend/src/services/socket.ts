import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/store/authStore'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    const token = useAuthStore.getState().token
    socket = io(BASE_URL, {
      auth: { token },
      transports: ['websocket'],
      autoConnect: false,
    })
  }
  return socket
}

export function connectSocket(): void {
  const s = getSocket()
  if (!s.connected) s.connect()
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect()
  }
}

// ── WebSocket helper for chat streaming ───────────────────────────────────────
export function createChatWebSocket(
  sessionId: string,
  onChunk: (chunk: string) => void,
  onDone: (fullContent: string) => void,
  onError: (err: string) => void
): WebSocket {
  const token = useAuthStore.getState().token
  const wsUrl = BASE_URL.replace('http', 'ws')
  const ws = new WebSocket(`${wsUrl}/ws/chat/ws/${sessionId}`)

  ws.onopen = () => {
    console.log('[JARVIS WS] Connected to chat session:', sessionId)
  }

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'chunk' && data.content) {
        onChunk(data.content)
      } else if (data.type === 'done') {
        onDone(data.content || '')
      } else if (data.type === 'error') {
        onError(data.error || 'Unknown error')
      }
    } catch {
      // raw text chunk
      onChunk(event.data)
    }
  }

  ws.onerror = () => {
    onError('WebSocket connection error')
  }

  ws.onclose = () => {
    console.log('[JARVIS WS] Chat session closed:', sessionId)
  }

  return ws
}
