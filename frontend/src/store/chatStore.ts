import { create } from 'zustand'
import type { ChatMessage, ChatSession, ChatSessionSummary } from '@/types'

interface ChatState {
  sessions: ChatSessionSummary[]
  activeSession: ChatSession | null
  isStreaming: boolean
  streamingContent: string

  setSessions: (sessions: ChatSessionSummary[]) => void
  addSession: (session: ChatSessionSummary) => void
  removeSession: (id: string) => void
  setActiveSession: (session: ChatSession | null) => void
  addMessage: (message: ChatMessage) => void
  updateLastMessage: (content: string) => void
  setStreaming: (streaming: boolean) => void
  appendStreamChunk: (chunk: string) => void
  finalizeStream: () => void
  clearStreamingContent: () => void
}

export const useChatStore = create<ChatState>()((set, get) => ({
  sessions: [],
  activeSession: null,
  isStreaming: false,
  streamingContent: '',

  setSessions: (sessions) => set({ sessions }),

  addSession: (session) =>
    set((state) => ({ sessions: [session, ...state.sessions] })),

  removeSession: (id) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      activeSession:
        state.activeSession?.id === id ? null : state.activeSession,
    })),

  setActiveSession: (session) => set({ activeSession: session }),

  addMessage: (message) =>
    set((state) => ({
      activeSession: state.activeSession
        ? { ...state.activeSession, messages: [...state.activeSession.messages, message] }
        : null,
    })),

  updateLastMessage: (content) =>
    set((state) => {
      if (!state.activeSession) return state
      const messages = [...state.activeSession.messages]
      if (messages.length > 0) {
        messages[messages.length - 1] = { ...messages[messages.length - 1], content }
      }
      return { activeSession: { ...state.activeSession, messages } }
    }),

  setStreaming: (streaming) => set({ isStreaming: streaming }),

  appendStreamChunk: (chunk) =>
    set((state) => ({ streamingContent: state.streamingContent + chunk })),

  finalizeStream: () => {
    const { streamingContent, activeSession } = get()
    if (!activeSession) return
    set({
      isStreaming: false,
      streamingContent: '',
    })
  },

  clearStreamingContent: () => set({ streamingContent: '' }),
}))
