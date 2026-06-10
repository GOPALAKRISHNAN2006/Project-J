// ── Shared TypeScript types for JARVIS ────────────────────────────────────────

export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  is_active: boolean
  google_id?: string
  github_id?: string
  ai_provider: string
  openai_api_key?: string
  openai_base_url?: string
  gemini_api_key?: string
  default_model: string
  system_prompt?: string
  stt_provider: string
  tts_provider: string
  elevenlabs_api_key?: string
  voice_id?: string
  has_openai_api_key: boolean
  has_gemini_api_key: boolean
  has_elevenlabs_api_key: boolean
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

// ── Chat ─────────────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: string
  tokens?: number
  model?: string
}

export interface ChatSession {
  id: string
  user_id: string
  title: string
  messages: ChatMessage[]
  model: string
  created_at: string
  updated_at: string
  is_archived: boolean
}

export interface ChatSessionSummary {
  id: string
  title: string
  model: string
  created_at: string
  updated_at: string
  message_count: number
  is_archived: boolean
}

// ── Automation ────────────────────────────────────────────────────────────────

export type TriggerType = 'schedule' | 'event' | 'manual'

export interface Automation {
  id: string
  name: string
  description?: string
  trigger_type: TriggerType
  trigger_config?: Record<string, unknown>
  actions: AutomationAction[]
  is_active: boolean
  run_count: number
  last_run?: string
  created_at?: string
}

export interface AutomationAction {
  type: string
  config: Record<string, unknown>
}

// ── Memory ────────────────────────────────────────────────────────────────────

export type MemoryCategory = 'projects' | 'people' | 'preferences' | 'deadlines' | 'habits' | 'learning' | 'goals' | 'general'

export interface MemoryEntry {
  id: string
  content: string
  category?: MemoryCategory
  metadata?: Record<string, unknown>
  distance?: number
}

// ── Plugin ────────────────────────────────────────────────────────────────────

export interface Plugin {
  id: string
  name: string
  description: string
  version: string
  author: string
  category: string
  icon: string
  is_installed: boolean
  is_enabled: boolean
  config_schema: Record<string, string>
}

// ── AI Models ─────────────────────────────────────────────────────────────────

export interface AIModel {
  id: string
  name: string
  provider: string
  context: string
}

// ── System Stats (for dashboard) ──────────────────────────────────────────────

export interface SystemStats {
  cpu: number
  memory: number
  sessions: number
  messages: number
  uptime: string
}

// ── WebSocket events ─────────────────────────────────────────────────────────

export interface WSMessage {
  type: 'start' | 'chunk' | 'done' | 'error'
  content?: string
  session_id?: string
  error?: string
}

// ── Navigation ────────────────────────────────────────────────────────────────

export interface NavItem {
  id: string
  label: string
  path: string
  icon: string
}
