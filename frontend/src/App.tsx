import { lazy, Suspense } from 'react'
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import AppShell from './components/layout/AppShell'
import ProtectedRoute from './components/auth/ProtectedRoute'

// Lazy load pages
const AuthPage = lazy(() => import('./pages/AuthPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const VoicePage = lazy(() => import('./pages/VoicePage'))
const MemoryPage = lazy(() => import('./pages/MemoryPage'))
const AutomationPage = lazy(() => import('./pages/AutomationPage'))
const PluginsPage = lazy(() => import('./pages/PluginsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const VisionPage = lazy(() => import('./pages/VisionPage'))
const TasksPage = lazy(() => import('./pages/TasksPage'))

// Simple loading fallback
const PageLoader = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-[#080c18]">
    <div className="relative h-12 w-12">
      <div className="absolute inset-0 animate-ping rounded-full border-2 border-blue-500 opacity-20"></div>
      <div className="absolute inset-2 animate-pulse rounded-full border-2 border-blue-400"></div>
    </div>
  </div>
)

const isElectron = navigator.userAgent.toLowerCase().includes('electron')
const Router = isElectron ? HashRouter : BrowserRouter

export default function App() {
  const { token } = useAuthStore()

  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route
            path="/auth"
            element={token ? <Navigate to="/dashboard" replace /> : <AuthPage />}
          />

          {/* Protected — wrapped in AppShell */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="chat/:sessionId" element={<ChatPage />} />
              <Route path="voice" element={<VoicePage />} />
              <Route path="memory" element={<MemoryPage />} />
              <Route path="automation" element={<AutomationPage />} />
              <Route path="vision" element={<VisionPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="plugins" element={<PluginsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </Router>
  )
}
