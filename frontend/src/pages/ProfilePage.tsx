import { motion } from 'framer-motion'
import { 
  User, Mail, Shield, ShieldCheck, Key, 
  Settings, LogOut, Camera, Github, Globe 
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import GlassCard from '@/components/ui/GlassCard'
import JarvisButton from '@/components/ui/JarvisButton'

export default function ProfilePage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/auth')
  }

  if (!user) return null

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header section */}
      <div className="flex flex-col md:flex-row items-center gap-8 mb-10">
        <div className="relative group">
          <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-jarvis-primary/30 p-1 group-hover:border-jarvis-primary transition-all duration-300">
            <div className="w-full h-full rounded-full bg-jarvis-primary/10 flex items-center justify-center">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <User size={64} className="text-jarvis-primary/40" />
              )}
            </div>
          </div>
          <button className="absolute bottom-0 right-0 p-2 rounded-full bg-jarvis-bg-2 border border-jarvis-primary/50 text-jarvis-primary hover:bg-jarvis-primary hover:text-jarvis-bg transition-all shadow-jarvis">
            <Camera size={14} />
          </button>
        </div>

        <div className="text-center md:text-left">
          <h2 className="text-3xl font-orbitron font-bold text-neon mb-1">{user.name}</h2>
          <p className="text-jarvis-text-3 font-mono text-xs uppercase tracking-[0.2em] mb-4">Neural Access Node: {user.id.slice(0, 8)}</p>
          <div className="flex flex-wrap justify-center md:justify-start gap-3">
            <span className="badge-online">SYSTEM ACTIVE</span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-jarvis-primary/10 border border-jarvis-primary/30 text-jarvis-primary uppercase">Tier 1 Operator</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Identity Card */}
        <div className="md:col-span-2 space-y-6">
          <GlassCard className="p-6">
            <h3 className="font-orbitron text-sm font-bold text-jarvis-primary uppercase tracking-widest mb-6 flex items-center gap-2">
              <User size={16} /> Identity Matrix
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-jarvis-text-3 uppercase tracking-wider">Full Identity</label>
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10 text-sm">{user.name}</div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-jarvis-text-3 uppercase tracking-wider">Communication Frequency</label>
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/10 text-sm flex items-center gap-2">
                  <Mail size={14} className="text-jarvis-text-3" /> {user.email}
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex justify-end">
              <JarvisButton size="sm">Modify Profile</JarvisButton>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="font-orbitron text-sm font-bold text-jarvis-primary uppercase tracking-widest mb-6 flex items-center gap-2">
              <ShieldCheck size={16} /> Security Protocols
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-jarvis-primary/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-jarvis-primary/10 text-jarvis-primary">
                    <Key size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Access Code</p>
                    <p className="text-xs text-jarvis-text-3">Last rotated: 3 months ago</p>
                  </div>
                </div>
                <JarvisButton variant="solid" size="sm">Update</JarvisButton>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                    <Globe size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Google Linkage</p>
                    <p className="text-xs text-jarvis-text-3">{user.google_id ? 'Authenticated' : 'Not Linked'}</p>
                  </div>
                </div>
                <JarvisButton variant="solid" size="sm" disabled={!!user.google_id}>
                  {user.google_id ? 'Linked' : 'Establish'}
                </JarvisButton>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-white/10 text-white">
                    <Github size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">GitHub Repository</p>
                    <p className="text-xs text-jarvis-text-3">{user.github_id ? 'Authenticated' : 'Not Linked'}</p>
                  </div>
                </div>
                <JarvisButton variant="solid" size="sm" disabled={!!user.github_id}>
                  {user.github_id ? 'Linked' : 'Establish'}
                </JarvisButton>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Sidebar info */}
        <div className="space-y-6">
          <GlassCard className="p-6">
            <div className="text-center">
              <Shield size={48} className="mx-auto text-jarvis-primary mb-4 opacity-50" />
              <h4 className="font-orbitron text-xs font-bold uppercase tracking-widest mb-1">System Trust Score</h4>
              <p className="text-3xl font-orbitron font-black text-jarvis-primary">99.8%</p>
              <div className="mt-4 h-1 rounded-full bg-white/5 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '99.8%' }}
                  className="h-full bg-jarvis-primary shadow-[0_0_10px_#00d4ff]"
                />
              </div>
              <p className="mt-4 text-[10px] text-jarvis-text-3 font-mono uppercase tracking-wider">ALL SYSTEMS NOMINAL</p>
            </div>
          </GlassCard>

          <div className="space-y-2">
            <button className="w-full flex items-center justify-between p-4 rounded-xl glass-card-hover group">
              <div className="flex items-center gap-3">
                <Settings size={18} className="text-jarvis-text-3 group-hover:text-jarvis-primary transition-colors" />
                <span className="text-sm font-medium">Interface Config</span>
              </div>
            </button>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-all group"
            >
              <div className="flex items-center gap-3">
                <LogOut size={18} />
                <span className="text-sm font-medium">Terminate Session</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
