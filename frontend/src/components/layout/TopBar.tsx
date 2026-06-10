import { motion } from 'framer-motion'
import { Bell, Search, Wifi, WifiOff } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import StatusIndicator from '../ui/StatusIndicator'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/chat': 'AI Chat',
  '/voice': 'Voice Interface',
  '/memory': 'Memory Bank',
  '/automation': 'Automation',
  '/plugins': 'Plugins',
  '/settings': 'Settings',
}

export default function TopBar() {
  const { user } = useAuthStore()
  const location = useLocation()
  const [backendOnline, setBackendOnline] = useState(false)
  const [time, setTime] = useState(new Date())

  const title = PAGE_TITLES[location.pathname] || 'JARVIS'

  // Ping backend
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('http://localhost:8000/health', { signal: AbortSignal.timeout(2000) })
        setBackendOnline(res.ok)
      } catch {
        setBackendOnline(false)
      }
    }
    check()
    const interval = setInterval(check, 10_000)
    return () => clearInterval(interval)
  }, [])

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header
      className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b"
      style={{
        background: 'rgba(8, 12, 24, 0.95)',
        borderColor: 'rgba(0, 212, 255, 0.08)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Left — Page title */}
      <div className="flex items-center gap-4">
        {/* Drag region for Electron (custom title bar) */}
        <div className="electron-drag flex items-center gap-3" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
          <motion.h1
            key={title}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-orbitron font-bold text-jarvis-primary text-lg tracking-wider"
          >
            {title}
          </motion.h1>
          <div className="hidden sm:flex items-center gap-1 text-jarvis-text-3 text-xs font-mono">
            <span className="text-jarvis-primary">/</span>
            <span>{user?.name || 'Agent'}</span>
          </div>
        </div>
      </div>

      {/* Center — Search */}
      <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-lg flex-1 max-w-xs mx-8"
        style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.1)' }}
      >
        <Search size={14} className="text-jarvis-text-3" />
        <input
          type="text"
          placeholder="Search JARVIS..."
          className="bg-transparent text-sm text-jarvis-text placeholder-jarvis-text-3 outline-none w-full"
          onFocus={(e) => e.currentTarget.parentElement?.classList.add('border-glow')}
          onBlur={(e) => e.currentTarget.parentElement?.classList.remove('border-glow')}
        />
      </div>

      {/* Right — Status */}
      <div className="flex items-center gap-5">
        {/* Live clock */}
        <div className="hidden sm:block text-jarvis-text-3 text-xs font-mono">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>

        {/* Backend status */}
        <div className="flex items-center gap-2">
          {backendOnline ? (
            <Wifi size={14} className="text-jarvis-secondary" />
          ) : (
            <WifiOff size={14} className="text-jarvis-danger" />
          )}
          <StatusIndicator online={backendOnline} label={backendOnline ? 'API Online' : 'API Offline'} size="sm" />
        </div>

        {/* Notification bell */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="relative p-2 rounded-lg text-jarvis-text-2 hover:text-jarvis-primary transition-colors"
          style={{ background: 'rgba(0,212,255,0.05)' }}
        >
          <Bell size={16} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-jarvis-accent" />
        </motion.button>

        {/* User avatar */}
        {user && (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-jarvis-bg cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #00d4ff, #00ff88)' }}
            title={user.email}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </header>
  )
}
