import { create } from 'zustand'

interface UIState {
  sidebarCollapsed: boolean
  activePage: string
  notifications: Notification[]

  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void
  setActivePage: (page: string) => void
  addNotification: (n: Notification) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
}

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message?: string
  timestamp: number
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarCollapsed: false,
  activePage: 'dashboard',
  notifications: [],

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

  setActivePage: (page) => set({ activePage: page }),

  addNotification: (n) =>
    set((state) => ({
      notifications: [n, ...state.notifications].slice(0, 10),
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearNotifications: () => set({ notifications: [] }),
}))
