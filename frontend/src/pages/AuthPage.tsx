
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Eye, EyeOff, Cpu, Lock, Mail, User, AlertCircle, 
  Github, Globe, ArrowLeft, ShieldCheck 
} from 'lucide-react'
import { authAPI } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import HexGrid from '@/components/ui/HexGrid'
import JarvisButton from '@/components/ui/JarvisButton'

type Mode = 'login' | 'register' | 'forgot' | 'reset'

export default function AuthPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const [mode, setMode] = useState<Mode>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const [form, setForm] = useState({ name: '', email: '', password: '', resetToken: '', newPassword: '' })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      if (mode === 'login') {
        const res = await authAPI.login({ email: form.email, password: form.password }, rememberMe)
        setAuth(res.data.access_token, res.data.user)
        navigate('/dashboard')
      } else if (mode === 'register') {
        if (!form.name.trim()) throw new Error('Name is required')
        const res = await authAPI.register({ email: form.email, name: form.name, password: form.password })
        setAuth(res.data.access_token, res.data.user)
        navigate('/dashboard')
      } else if (mode === 'forgot') {
        const res = await authAPI.forgotPassword(form.email)
        setSuccess('Neural reset link generated. Check your console (demo).')
        // For demo purposes, we'll auto-fill the token and switch to reset mode after a delay
        if (res.data.debug_token) {
          setTimeout(() => {
            setForm(f => ({ ...f, resetToken: res.data.debug_token }))
            setMode('reset')
          }, 2000)
        }
      } else if (mode === 'reset') {
        await authAPI.resetPassword(form.resetToken, form.newPassword)
        setSuccess('Neural link restored. You can now sign in.')
        setTimeout(() => setMode('login'), 2000)
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail
      const msg = Array.isArray(detail) ? detail[0]?.msg : detail
      setError(msg || err.message || 'Access denied. System failure.')
    } finally {
      setLoading(false)
    }
  }

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    setLoading(true)
    try {
      const res = await authAPI.socialLogin(provider, `mock_${provider}_token_${Math.random().toString(36).slice(2)}`)
      setAuth(res.data.access_token, res.data.user)
      navigate('/dashboard')
    } catch (err: any) {
      setError(`Failed to connect via ${provider}.`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-jarvis-bg">
      <HexGrid opacity={0.06} />
      <div className="absolute inset-0 pointer-events-none bg-cyan-glow" />
      <div className="scan-line" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="text-center mb-6">
          <motion.div
            animate={{ rotateY: [0, 360] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-xl mb-4 border-glow shadow-jarvis"
            style={{ background: 'rgba(0,212,255,0.1)' }}
          >
            <Cpu size={32} className="text-jarvis-primary" />
          </motion.div>
          <h1 className="font-orbitron font-black text-3xl text-neon tracking-[0.3em] uppercase">JARVIS</h1>
          <p className="text-jarvis-text-3 text-[10px] mt-1 font-mono tracking-widest uppercase opacity-60">Authentication Protocol v4.0</p>
        </div>

        <div className="glass-card p-8 relative overflow-hidden">
          <span className="corner-tl" /><span className="corner-tr" />
          <span className="corner-bl" /><span className="corner-br" />

          <AnimatePresence mode="wait">
            {mode === 'login' || mode === 'register' ? (
              <motion.div
                key="auth-tabs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex rounded-lg p-1 mb-6 bg-white/[0.03] border border-white/10"
              >
                {(['login', 'register'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setError('') }}
                    className={`flex-1 py-2 rounded-md text-[10px] font-orbitron font-bold uppercase tracking-widest transition-all ${
                      mode === m ? 'bg-jarvis-primary/20 text-jarvis-primary border border-jarvis-primary/40' : 'text-jarvis-text-3 hover:text-jarvis-text-2'
                    }`}
                  >
                    {m === 'login' ? 'Sign In' : 'Enlist'}
                  </button>
                ))}
              </motion.div>
            ) : (
              <motion.button
                key="back-btn"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setMode('login')}
                className="flex items-center gap-2 text-jarvis-text-3 hover:text-jarvis-primary text-[10px] font-mono uppercase tracking-widest mb-6 transition-colors"
              >
                <ArrowLeft size={14} /> Return to Base
              </motion.button>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === 'register' && (
                <motion.div
                  key="field-name"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="block text-[10px] font-mono text-jarvis-text-3 mb-1.5 uppercase tracking-widest">Operator Identity</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-jarvis-primary/50" />
                    <input name="name" type="text" value={form.name} onChange={handleChange} placeholder="Tony Stark" className="input-jarvis pl-9 text-sm" />
                  </div>
                </motion.div>
              )}

              {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
                <motion.div key="field-email">
                  <label className="block text-[10px] font-mono text-jarvis-text-3 mb-1.5 uppercase tracking-widest">Neural ID (Email)</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-jarvis-primary/50" />
                    <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="tony@stark.com" className="input-jarvis pl-9 text-sm" required />
                  </div>
                </motion.div>
              )}

              {(mode === 'login' || mode === 'register') && (
                <motion.div key="field-pass">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-mono text-jarvis-text-3 uppercase tracking-widest">Access Code</label>
                    {mode === 'login' && (
                      <button type="button" onClick={() => setMode('forgot')} className="text-[9px] font-mono text-jarvis-primary/60 hover:text-jarvis-primary uppercase tracking-wider">Forgot Code?</button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-jarvis-primary/50" />
                    <input name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange} placeholder="••••••••" className="input-jarvis pl-9 pr-10 text-sm" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-jarvis-text-3 hover:text-jarvis-primary transition-colors">
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </motion.div>
              )}

              {mode === 'reset' && (
                <motion.div key="field-reset" className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono text-jarvis-text-3 mb-1.5 uppercase tracking-widest">Reset Token</label>
                    <input name="resetToken" type="text" value={form.resetToken} onChange={handleChange} className="input-jarvis text-sm" required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-jarvis-text-3 mb-1.5 uppercase tracking-widest">New Access Code</label>
                    <input name="newPassword" type="password" value={form.newPassword} onChange={handleChange} className="input-jarvis text-sm" required />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {mode === 'login' && (
              <div className="flex items-center gap-2">
                <input 
                  id="remember" 
                  type="checkbox" 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3 h-3 rounded border-white/20 bg-transparent text-jarvis-primary focus:ring-jarvis-primary/40" 
                />
                <label htmlFor="remember" className="text-[10px] font-mono text-jarvis-text-3 uppercase tracking-wider cursor-pointer">Remember Operator</label>
              </div>
            )}

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-3 rounded-lg text-[10px] font-mono bg-red-500/10 border border-red-500/20 text-red-400">
                  <AlertCircle size={14} /> {error}
                </motion.div>
              )}
              {success && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-3 rounded-lg text-[10px] font-mono bg-green-500/10 border border-green-500/20 text-green-400">
                  <ShieldCheck size={14} /> {success}
                </motion.div>
              )}
            </AnimatePresence>

            <JarvisButton type="submit" variant="solid" size="lg" loading={loading} className="w-full justify-center">
              {mode === 'login' ? 'ESTABLISH LINK' : mode === 'register' ? 'INITIALIZE CORE' : mode === 'forgot' ? 'SEND RESET SIGNAL' : 'RESTORE ACCESS'}
            </JarvisButton>
          </form>

          {(mode === 'login' || mode === 'register') && (
            <div className="mt-8">
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                <div className="relative flex justify-center text-[9px] font-mono uppercase tracking-[0.3em]"><span className="bg-jarvis-bg px-4 text-jarvis-text-3">Social Linkage</span></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleSocialLogin('google')} className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] hover:border-jarvis-primary/40 transition-all group">
                  <Globe size={14} className="text-jarvis-text-3 group-hover:text-jarvis-primary" />
                  <span className="text-[10px] font-mono text-jarvis-text-2 uppercase tracking-widest">Google</span>
                </button>
                <button onClick={() => handleSocialLogin('github')} className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] hover:border-jarvis-primary/40 transition-all group">
                  <Github size={14} className="text-jarvis-text-3 group-hover:text-jarvis-primary" />
                  <span className="text-[10px] font-mono text-jarvis-text-2 uppercase tracking-widest">GitHub</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-jarvis-text-3 text-[9px] mt-8 font-mono tracking-[0.2em] uppercase opacity-40">
          STARK INDUSTRIES · CLASSIFIED · {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  )
}
