import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/auth'
    }
    return Promise.reject(error)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (data: any, remember: boolean = false) => api.post(`/api/auth/login?remember=${remember}`, data),
  register: (data: any) => api.post('/api/auth/register', data),
  me: () => api.get('/api/auth/me'),
  forgotPassword: (email: string) => api.post('/api/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) => api.post('/api/auth/reset-password', { token, new_password: newPassword }),
  socialLogin: (provider: string, token: string) => api.post(`/api/auth/social/${provider}`, { token }),
}

// ── Chat ──────────────────────────────────────────────────────────────────────
export const chatAPI = {
  listSessions: () => api.get('/api/chat/sessions'),
  createSession: (data: any = {}) => api.post('/api/chat/sessions', data),
  getSession: (id: string) => api.get(`/api/chat/sessions/${id}`),
  deleteSession: (id: string) => api.delete(`/api/chat/sessions/${id}`),
  sendMessage: (data: any) => api.post('/api/chat/send', data),
  getHistory: (sessionId: string) => api.get(`/api/chat/history/${sessionId}`),
  upload: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/api/chat/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}

// ── Memory ────────────────────────────────────────────────────────────────────
export const memoryAPI = {
  list: (category?: string, collection = 'jarvis_memory', limit = 20) =>
    api.get('/api/memory/', { params: { category, collection, limit } }),
  create: (data: { content: string; category?: string; metadata?: Record<string, unknown>; collection?: string }) =>
    api.post('/api/memory/', data),
  search: (query: string, n_results = 5, category?: string) =>
    api.post('/api/memory/search', { query, n_results, category }),
  delete: (id: string) => api.delete(`/api/memory/${id}`),
}

// ── Automation ────────────────────────────────────────────────────────────────
export const automationAPI = {
  list: () => api.get('/api/automation/'),
  create: (data: Record<string, unknown>) => api.post('/api/automation/', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/api/automation/${id}`, data),
  delete: (id: string) => api.delete(`/api/automation/${id}`),
  run: (id: string) => api.post(`/api/automation/${id}/run`),
  solve: (goal: string) => api.post('/api/automation/solve', { goal }),
}

// ── Plugins ───────────────────────────────────────────────────────────────────
export const pluginsAPI = {
  list: () => api.get('/api/plugins/'),
  discover: () => api.get('/api/plugins/discover'),
  marketplace: () => api.get('/api/plugins/marketplace'),
  install: (pluginName: string) => api.post(`/api/plugins/install/${pluginName}`),
  toggle: (id: string, enabled: boolean) => api.patch(`/api/plugins/${id}/toggle`, { enabled }),
  getDocs: (id: string) => api.get(`/api/plugins/${id}/docs`),
}

// ── Settings ──────────────────────────────────────────────────────────────────
export const settingsAPI = {
  get: () => api.get('/api/settings/'),
  update: (data: any) => api.patch('/api/settings/', data),
  listProviders: () => api.get('/api/settings/providers'),
  listModels: (providerName?: string) =>
    api.get('/api/settings/models', { params: { provider_name: providerName } }),
}
