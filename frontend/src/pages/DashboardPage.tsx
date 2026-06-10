import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  MessageSquare, Brain, Zap, Puzzle, ArrowRight,
  TrendingUp, Clock, Cpu, HardDrive, Activity, Plus,
  Database, Shield, Globe, Monitor
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { chatAPI } from '@/services/api'
import GlassCard from '@/components/ui/GlassCard'
import JarvisButton from '@/components/ui/JarvisButton'
import StatusIndicator from '@/components/ui/StatusIndicator'
import AIAvatar from '@/components/ui/AIAvatar'
import VoiceIndicator from '@/components/ui/VoiceIndicator'
import WeatherWidget from '@/components/ui/WeatherWidget'
import RemindersWidget from '@/components/ui/RemindersWidget'
import type { ChatSessionSummary } from '@/types'

const QUICK_ACTIONS = [
  { label: 'New Chat', icon: MessageSquare, path: '/chat', color: '#00d4ff' },
  { label: 'Memory',   icon: Brain,         path: '/memory', color: '#00ff88' },
  { label: 'Automate', icon: Zap,           path: '/automation', color: '#ffaa00' },
  { label: 'Plugins',  icon: Puzzle,        path: '/plugins', color: '#a855f7' },
]

function StatCard({ label, value, icon: Icon, color, delay, subValue }: {
  label: string; value: string | number; icon: React.ElementType; color: string; delay: number; subValue?: string
}) {
  return (
    <GlassCard delay={delay} className="p-4 relative group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-jarvis-text-3 text-[10px] uppercase tracking-[0.2em] mb-1 font-mono">{label}</p>
          <p className="text-xl font-orbitron font-bold group-hover:text-neon transition-all duration-300" style={{ color }}>{value}</p>
          {subValue && <p className="text-[10px] text-jarvis-text-3 font-mono mt-0.5">{subValue}</p>}
        </div>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
          style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <div className="mt-4 h-[2px] rounded-full overflow-hidden bg-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '70%' }}
          transition={{ duration: 1.5, delay: delay + 0.2, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}40, ${color})`, boxShadow: `0 0 8px ${color}` }}
        />
      </div>
    </GlassCard>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    chatAPI.listSessions()
      .then((res) => setSessions(res.data.slice(0, 5)))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false))
  }, [])

  const greeting = () => {
    const h = time.getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const handleNewChat = async () => {
    const res = await chatAPI.createSession('New Conversation')
    navigate(`/chat/${res.data.id}`)
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Top Section: Avatar & Greeting */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8">
          <GlassCard glow className="p-8 h-full flex flex-col justify-center relative overflow-hidden" delay={0}>
            {/* Background decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-jarvis-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
            
            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
              <AIAvatar />
              
              <div className="text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                  <StatusIndicator online label="Core Online" />
                  <span className="text-jarvis-text-3 font-mono text-[10px] uppercase tracking-widest">System v4.0.2</span>
                </div>
                <h2 className="font-orbitron font-bold text-3xl text-jarvis-primary mb-2">
                  {greeting()}, {user?.name?.split(' ')[0] || 'Agent'}.
                </h2>
                <p className="text-jarvis-text-2 max-w-md">
                  I am JARVIS. All subsystems are currently operational. Ready for your instructions.
                </p>
                <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-4">
                  <VoiceIndicator isListening={false} />
                  <div className="h-10 w-[1px] bg-jarvis-primary/20 hidden md:block" />
                  <div className="text-left">
                    <p className="text-jarvis-text-3 text-[10px] uppercase font-mono mb-1">Current Focus</p>
                    <p className="text-sm font-medium text-jarvis-text">Idle - Waiting for prompt</p>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <GlassCard className="p-6 flex-1 flex flex-col justify-center items-center text-center" delay={0.1}>
            <p className="text-jarvis-text-3 text-xs font-mono uppercase tracking-[0.3em] mb-2">{time.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</p>
            <div className="font-orbitron font-bold text-5xl text-jarvis-primary tracking-tighter mb-1">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
            </div>
            <div className="text-jarvis-text-3 text-sm font-mono flex items-center gap-2">
              <span className="text-jarvis-primary opacity-50">SYNCING</span>
              <span>{time.getSeconds().toString().padStart(2, '0')}s</span>
            </div>
          </GlassCard>
          <WeatherWidget />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard label="CPU" value="24%" icon={Cpu} color="#00d4ff" delay={0.2} subValue="Core Temp: 42°C" />
        <StatCard label="RAM" value="4.2 GB" icon={HardDrive} color="#00ff88" delay={0.25} subValue="Available: 11.8 GB" />
        <StatCard label="GPU" value="12%" icon={Monitor} color="#ffaa00" delay={0.3} subValue="RTX 4090 Active" />
        <StatCard label="Network" value="842 Mbps" icon={Globe} color="#a855f7" delay={0.35} subValue="Ping: 12ms" />
        <StatCard label="Storage" value="62%" icon={Database} color="#00d4ff" delay={0.4} subValue="NVMe-1 Healthy" />
        <StatCard label="Security" value="Secure" icon={Shield} color="#00ff88" delay={0.45} subValue="Firewall Active" />
      </div>

      {/* Bottom Section: Reminders, Actions, Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <RemindersWidget />
          <GlassCard className="p-5" delay={0.5}>
            <h3 className="font-orbitron font-semibold text-jarvis-primary text-[10px] mb-4 uppercase tracking-[0.2em]">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {QUICK_ACTIONS.map(({ label, icon: Icon, path, color }) => (
                <motion.button
                  key={label}
                  whileHover={{ scale: 1.05, backgroundColor: `${color}15` }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(path)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-white/5 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                >
                  <Icon size={16} style={{ color }} />
                  <span className="text-[10px] font-medium text-jarvis-text-2 uppercase tracking-wider">{label}</span>
                </motion.button>
              ))}
            </div>
          </GlassCard>
        </div>

        <div className="lg:col-span-9">
          <GlassCard className="p-6 h-full" delay={0.55}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-orbitron font-semibold text-jarvis-primary text-sm uppercase tracking-wider">Memory Archives</h3>
                <p className="text-jarvis-text-3 text-[10px] font-mono mt-1">Accessing recent interaction neural patterns...</p>
              </div>
              <JarvisButton size="sm" onClick={handleNewChat} icon={<Plus size={14} />}>
                Initialize Session
              </JarvisButton>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="spinner-jarvis" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <MessageSquare size={48} className="text-jarvis-text-3/20 mb-4" />
                <p className="text-jarvis-text-3 text-sm font-orbitron">No neural patterns found.</p>
                <JarvisButton variant="solid" size="sm" className="mt-6" onClick={handleNewChat}>
                  Start First Session
                </JarvisButton>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sessions.map((session, i) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 + 0.05 * i }}
                    onClick={() => navigate(`/chat/${session.id}`)}
                    className="flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-300 border border-white/5 hover:border-jarvis-primary/30 group bg-white/[0.02] hover:bg-jarvis-primary/[0.04]"
                    whileHover={{ x: 4 }}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-jarvis-primary/5 border border-jarvis-primary/10 group-hover:border-jarvis-primary/30 transition-colors">
                      <MessageSquare size={16} className="text-jarvis-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-jarvis-text truncate group-hover:text-jarvis-primary transition-colors">{session.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-jarvis-text-3 font-mono">
                        <span className="flex items-center gap-1"><Clock size={10} /> {new Date(session.updated_at).toLocaleDateString()}</span>
                        <span>{session.message_count} MESSAGES</span>
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-jarvis-text-3 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                  </motion.div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
