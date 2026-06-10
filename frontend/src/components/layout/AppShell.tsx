import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import HexGrid from '../ui/HexGrid'
import GlobalVoiceAssistant from './GlobalVoiceAssistant'

export default function AppShell() {
  const location = useLocation()

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: '#080c18' }}>
      {/* Animated hex grid background */}
      <HexGrid opacity={0.035} />

      {/* Global Voice Assistant (Wake Word Detection) */}
      <GlobalVoiceAssistant />

      {/* Scan line */}
      <div className="scan-line" />

      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <TopBar />
        <main className="flex-1 overflow-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
