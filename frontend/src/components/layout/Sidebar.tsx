import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  MessageSquare,
  Mic,
  Brain,
  Zap,
  Puzzle,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Eye,
  Layout,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import StatusIndicator from '../ui/StatusIndicator'

const NAV_ITEMS = [
  { id: 'dashboard',  path: '/dashboard',  label: 'Dashboard',   Icon: LayoutDashboard },
  { id: 'chat',       path: '/chat',        label: 'AI Chat',     Icon: MessageSquare },
  { id: 'voice',      path: '/voice',       label: 'Voice',       Icon: Mic },
  { id: 'memory',     path: '/memory',      label: 'Memory',      Icon: Brain },
  { id: 'automation', path: '/automation',  label: 'Automation',  Icon: Zap },
  { id: 'tasks',      path: '/tasks',       label: 'Tasks',       Icon: Layout },
  { id: 'vision',     path: '/vision',      label: 'Vision',      Icon: Eye },
  { id: 'plugins',    path: '/plugins',     label: 'Plugins',     Icon: Puzzle },
]

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/auth')
  }

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 64 : 220 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="relative flex flex-col h-full flex-shrink-0 border-r overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #080c18 0%, #0a0f1e 100%)',
        borderColor: 'rgba(0, 212, 255, 0.1)',
      }}
    >
      {/* Top glow line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.6), transparent)' }}
      />

      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: 'rgba(0,212,255,0.08)' }}>
        <motion.div
          className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center animate-pulse-glow"
          style={{
            background: 'linear-gradient(135deg, rgba(0,212,255,0.3), rgba(0,212,255,0.1))',
            border: '1px solid rgba(0,212,255,0.5)',
          }}
        >
          <Cpu size={18} className="text-jarvis-primary" />
        </motion.div>

        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="font-orbitron font-bold text-jarvis-primary text-sm leading-none">
                JARVIS
              </div>
              <div className="text-jarvis-text-3 text-[10px] mt-0.5 font-mono">
                v1.0.0 · ONLINE
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ id, path, label, Icon }) => (
          <NavLink key={id} to={path}>
            {({ isActive }) => (
              <motion.div
                whileHover={{ x: sidebarCollapsed ? 0 : 2 }}
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                title={sidebarCollapsed ? label : undefined}
              >
                <Icon
                  size={18}
                  className={`flex-shrink-0 ${isActive ? 'text-jarvis-primary' : 'text-jarvis-text-3'}`}
                />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm font-medium whitespace-nowrap"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && !sidebarCollapsed && (
                  <motion.div
                    layoutId="active-indicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-jarvis-primary"
                  />
                )}
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-2 pb-4 space-y-1 border-t pt-3" style={{ borderColor: 'rgba(0,212,255,0.08)' }}>
        {/* Settings */}
        <NavLink to="/settings">
          {({ isActive }) => (
            <div className={`sidebar-item ${isActive ? 'active' : ''}`} title={sidebarCollapsed ? 'Settings' : undefined}>
              <Settings size={18} className={isActive ? 'text-jarvis-primary' : 'text-jarvis-text-3'} />
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm font-medium">
                    Settings
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          )}
        </NavLink>

        {/* User info */}
        <AnimatePresence>
          {!sidebarCollapsed && user && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-3 py-2 rounded-lg"
              style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.08)' }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-jarvis-bg"
                  style={{ background: 'linear-gradient(135deg, #00d4ff, #00ff88)' }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-jarvis-text truncate">{user.name}</div>
                  <StatusIndicator online label="Active" size="sm" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Logout */}
        <motion.button
          whileHover={{ x: sidebarCollapsed ? 0 : 2 }}
          onClick={handleLogout}
          className="sidebar-item w-full text-left hover:text-jarvis-danger"
          title={sidebarCollapsed ? 'Logout' : undefined}
        >
          <LogOut size={16} className="flex-shrink-0 text-jarvis-text-3" />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm">
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Collapse toggle button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center z-10"
        style={{
          background: '#0d1526',
          border: '1px solid rgba(0,212,255,0.3)',
          color: '#00d4ff',
        }}
      >
        {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </motion.button>
    </motion.aside>
  )
}
