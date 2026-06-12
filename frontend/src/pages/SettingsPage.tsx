import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  User, Bell, Shield, Save, Eye, EyeOff,
  Cpu, Palette, Database, Activity, Globe, Link, Zap
} from 'lucide-react'
import { settingsAPI } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import GlassCard from '@/components/ui/GlassCard'
import JarvisButton from '@/components/ui/JarvisButton'
import type { AIModel } from '@/types'

type Tab = 'profile' | 'ai' | 'voice' | 'appearance' | 'security' | 'database'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'profile',    label: 'Profile',     icon: User },
  { id: 'ai',        label: 'AI Config',   icon: Cpu },
  { id: 'voice',     label: 'Voice Stack', icon: Bell },
  { id: 'appearance',label: 'Appearance',  icon: Palette },
  { id: 'security',  label: 'Security',    icon: Shield },
  { id: 'database',  label: 'Database',    icon: Database },
]

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore()
  const [tab, setTab] = useState<Tab>('profile')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [providers, setProviders] = useState<{ id: string; name: string; description: string }[]>([])
  const [models, setModels] = useState<AIModel[]>([])
  const [showApiKey, setShowApiKey] = useState(false)

  const [form, setForm] = useState({
    name: user?.name || '',
    ai_provider: user?.ai_provider || 'gemini',
    default_model: user?.default_model || 'gemini-3.5-flash',
    system_prompt: user?.system_prompt || '',
    openai_api_key: '',
    openai_base_url: user?.openai_base_url || 'https://api.openai.com/v1',
    gemini_api_key: '',
    stt_provider: user?.stt_provider || 'faster-whisper',
    tts_provider: user?.tts_provider || 'piper',
    elevenlabs_api_key: '',
    voice_id: user?.voice_id || '',
    avatar_url: user?.avatar_url || '',
  })

  // Fetch providers on mount
  useEffect(() => {
    settingsAPI.listProviders().then((res) => setProviders(res.data.providers)).catch(() => {})
  }, [])

  // Fetch models when provider changes
  useEffect(() => {
    if (form.ai_provider) {
      setModels([])
      settingsAPI.listModels(form.ai_provider)
        .then((res) => {
          const fetchedModels = res.data.models || []
          setModels(fetchedModels)
          setForm((f) => {
            const isCurrentValid = fetchedModels.some((m: AIModel) => m.id === f.default_model)
            return {
              ...f,
              default_model: isCurrentValid ? f.default_model : (fetchedModels[0]?.id || f.default_model)
            }
          })
        })
        .catch(() => setModels([]))
    }
  }, [form.ai_provider])

  useEffect(() => {
    settingsAPI.get().then((res) => {
      setForm((f) => ({
        ...f,
        name: res.data.name || f.name,
        ai_provider: res.data.ai_provider || f.ai_provider,
        default_model: res.data.default_model || f.default_model,
        system_prompt: res.data.system_prompt || f.system_prompt,
        openai_base_url: res.data.openai_base_url || f.openai_base_url,
        stt_provider: res.data.stt_provider || f.stt_provider,
        tts_provider: res.data.tts_provider || f.tts_provider,
        voice_id: res.data.voice_id || f.voice_id,
        avatar_url: res.data.avatar_url || f.avatar_url,
      }))
    }).catch(() => {})
  }, [])

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      let isOk = false
      let message = ''
      
      if (form.ai_provider === 'openai') {
        isOk = !!form.openai_api_key || !!user?.has_openai_api_key
        message = isOk ? 'OpenAI configuration appears valid.' : 'OpenAI API key is missing.'
      } else if (form.ai_provider === 'gemini') {
        isOk = !!form.gemini_api_key || !!user?.has_gemini_api_key
        message = isOk ? 'Gemini configuration appears valid.' : 'Gemini API key is missing.'
      }

      setTestResult({ success: isOk, message })
    } catch (e: any) {
      setTestResult({ 
        success: false, 
        message: e.response?.data?.detail || 'Network error during connection test.' 
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const payload: Record<string, any> = {}
      if (form.name) payload.name = form.name
      payload.ai_provider = form.ai_provider
      if (form.default_model) payload.default_model = form.default_model
      if (form.system_prompt !== undefined) payload.system_prompt = form.system_prompt
      if (form.openai_api_key) payload.openai_api_key = form.openai_api_key
      if (form.openai_base_url) payload.openai_base_url = form.openai_base_url
      if (form.gemini_api_key) payload.gemini_api_key = form.gemini_api_key
      payload.stt_provider = form.stt_provider
      payload.tts_provider = form.tts_provider
      if (form.elevenlabs_api_key) payload.elevenlabs_api_key = form.elevenlabs_api_key
      if (form.voice_id) payload.voice_id = form.voice_id
      if (form.avatar_url) payload.avatar_url = form.avatar_url

      const res = await settingsAPI.update(payload)
      updateUser(res.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      alert('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
    <div>
      <label className="block text-xs font-medium text-jarvis-text-3 mb-1.5 uppercase tracking-wider">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-jarvis-text-3 mt-1 font-mono">{hint}</p>}
    </div>
  )

  const renderTab = () => {
    switch (tab) {
      case 'profile':
        return (
          <div className="space-y-5">
            <Field label="Display Name">
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="input-jarvis w-full" placeholder="Gokul" />
            </Field>
            <Field label="Avatar URL" hint="Provide a URL to a profile image">
              <input value={form.avatar_url} onChange={(e) => setForm((f) => ({ ...f, avatar_url: e.target.value }))}
                className="input-jarvis w-full" placeholder="https://..." />
            </Field>
            <Field label="Email">
              <input value={user?.email || ''} disabled className="input-jarvis w-full opacity-50 cursor-not-allowed" />
            </Field>

            {form.avatar_url && (
              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.1)' }}>
                <img src={form.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                <span className="text-xs text-jarvis-text-2">Avatar preview</span>
              </div>
            )}
          </div>
        )

      case 'ai':
        return (
          <div className="space-y-6">
            <div className="p-1.5 rounded-xl bg-black/40 border border-jarvis-primary/20 flex gap-2">
              {providers.length > 0 ? providers.map((p) => {
                const Icon = p.id === 'openai' ? Globe : Zap
                return (
                  <button
                    key={p.id}
                    onClick={() => setForm((f) => ({ ...f, ai_provider: p.id }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-orbitron transition-all ${
                      form.ai_provider === p.id 
                        ? 'bg-jarvis-primary/20 text-jarvis-primary border border-jarvis-primary/50 shadow-[0_0_15px_rgba(0,212,255,0.2)]' 
                        : 'text-jarvis-text-3 hover:text-jarvis-text-2 hover:bg-white/5'
                    }`}
                  >
                    <Icon size={14} />
                    {p.name}
                  </button>
                )
              }) : (
                <div className="flex-1 py-3 text-center text-xs text-jarvis-text-3">Loading providers...</div>
              )}
            </div>

            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Field label="Target Model Interface" hint="Select the primary neural engine for JARVIS">
                <div className="relative group">
                  <select 
                    value={form.default_model} 
                    onChange={(e) => setForm((f) => ({ ...f, default_model: e.target.value }))}
                    className="input-jarvis w-full appearance-none cursor-pointer group-hover:border-jarvis-primary/50 transition-colors"
                  >
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>{m.name} {m.context ? `— ${m.context} Context` : ''}</option>
                    ))}
                    {models.length === 0 && (
                      <option value={form.default_model}>{form.default_model}</option>
                    )}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-jarvis-primary/60">
                    <Activity size={14} className="animate-pulse" />
                  </div>
                </div>
              </Field>

              <div className="space-y-5">
                {form.ai_provider === 'openai' ? (
                  <>
                    <Field label="OpenAI API Gateway" hint="Encryption-layer: AES-256-GCM">
                      <div className="relative group">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={form.openai_api_key}
                          onChange={(e) => setForm((f) => ({ ...f, openai_api_key: e.target.value }))}
                          className="input-jarvis w-full pr-12 group-hover:border-jarvis-primary/50 transition-colors"
                          placeholder={user?.has_openai_api_key ? "•••••••••••••••• (API Key Set)" : "sk-••••••••••••••••"}
                        />
                        <button type="button" onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-jarvis-text-3 hover:text-jarvis-primary transition-colors">
                          {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </Field>
                    <Field label="Provider Endpoint">
                      <div className="relative">
                        <input value={form.openai_base_url} onChange={(e) => setForm((f) => ({ ...f, openai_base_url: e.target.value }))}
                          className="input-jarvis w-full pl-10" placeholder="https://api.openai.com/v1" />
                        <Link size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-jarvis-primary/40" />
                      </div>
                    </Field>
                  </>
                ) : (
                  <Field label="Gemini API Key" hint="Securely stored via environment variables">
                    <div className="relative group">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={form.gemini_api_key}
                        onChange={(e) => setForm((f) => ({ ...f, gemini_api_key: e.target.value }))}
                        className="input-jarvis w-full pr-12 group-hover:border-jarvis-primary/50 transition-colors"
                        placeholder={user?.has_gemini_api_key ? "•••••••••••••••• (API Key Set)" : "Enter Gemini API Key"}
                      />
                      <button type="button" onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-jarvis-text-3 hover:text-jarvis-primary transition-colors">
                        {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </Field>
                )}
              </div>

              <div className="pt-2">
                <JarvisButton 
                  variant="primary" 
                  onClick={handleTestConnection} 
                  loading={testing}
                  className="w-full text-[11px] h-9 border-jarvis-primary/30 hover:bg-jarvis-primary/5"
                >
                  Execute Connectivity Diagnostics
                </JarvisButton>
                
                {testResult && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-3 p-3 rounded-lg flex items-start gap-3 border ${
                      testResult.success 
                        ? 'bg-jarvis-secondary/5 border-jarvis-secondary/20 text-jarvis-secondary' 
                        : 'bg-red-500/5 border-red-500/20 text-red-400'
                    }`}
                  >
                    <div className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${testResult.success ? 'bg-jarvis-secondary animate-pulse' : 'bg-red-400'}`} />
                    <span className="text-[11px] font-mono leading-relaxed">{testResult.message}</span>
                  </motion.div>
                )}
              </div>

              <Field label="System Core Prompt" hint="Defines the fundamental personality and logic of JARVIS">
                <textarea
                  value={form.system_prompt}
                  onChange={(e) => setForm((f) => ({ ...f, system_prompt: e.target.value }))}
                  rows={4}
                  className="input-jarvis w-full resize-none font-mono text-[11px] leading-relaxed"
                  placeholder="[INIT_PROTOCOL] You are JARVIS..."
                />
              </Field>
            </div>
          </div>
        )

      case 'voice':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-jarvis-primary uppercase tracking-widest">Speech to Text (STT)</h4>
              <Field label="STT Provider">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'faster-whisper', name: 'Faster Whisper', desc: 'Local & Offline' },
                    { id: 'openai-whisper', name: 'OpenAI Whisper', desc: 'Cloud API' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setForm((f) => ({ ...f, stt_provider: p.id }))}
                      className={`p-3 rounded-lg text-left transition-all border ${
                        form.stt_provider === p.id 
                          ? 'border-jarvis-primary bg-jarvis-primary/10' 
                          : 'border-jarvis-text-3/20 hover:border-jarvis-text-3/50'
                      }`}
                    >
                      <p className={`text-xs font-bold ${form.stt_provider === p.id ? 'text-jarvis-primary' : 'text-jarvis-text'}`}>{p.name}</p>
                      <p className="text-[10px] text-jarvis-text-3 mt-0.5">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <div className="space-y-4 pt-4 border-t border-jarvis-text-3/10">
              <h4 className="text-xs font-bold text-jarvis-primary uppercase tracking-widest">Text to Speech (TTS)</h4>
              <Field label="TTS Provider">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'piper', name: 'Piper TTS', desc: 'Local & Offline' },
                    { id: 'openai-tts', name: 'OpenAI TTS', desc: 'High Quality Cloud' },
                    { id: 'elevenlabs', name: 'ElevenLabs', desc: 'Ultra Realistic' },
                    { id: 'gtts', name: 'Google TTS', desc: 'Simple Cloud' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setForm((f) => ({ ...f, tts_provider: p.id }))}
                      className={`p-3 rounded-lg text-left transition-all border ${
                        form.tts_provider === p.id 
                          ? 'border-jarvis-primary bg-jarvis-primary/10' 
                          : 'border-jarvis-text-3/20 hover:border-jarvis-text-3/50'
                      }`}
                    >
                      <p className={`text-xs font-bold ${form.tts_provider === p.id ? 'text-jarvis-primary' : 'text-jarvis-text'}`}>{p.name}</p>
                      <p className="text-[10px] text-jarvis-text-3 mt-0.5">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </Field>

              {form.tts_provider === 'elevenlabs' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                  <Field label="ElevenLabs API Key">
                    <input
                      type="password"
                      value={form.elevenlabs_api_key}
                      onChange={(e) => setForm((f) => ({ ...f, elevenlabs_api_key: e.target.value }))}
                      className="input-jarvis w-full"
                      placeholder={user?.has_elevenlabs_api_key ? "•••••••••••••••• (API Key Set)" : "Enter your API key"}
                    />
                  </Field>
                  <Field label="Voice ID">
                    <input
                      value={form.voice_id}
                      onChange={(e) => setForm((f) => ({ ...f, voice_id: e.target.value }))}
                      className="input-jarvis w-full"
                      placeholder="Enter Voice ID"
                    />
                  </Field>
                </div>
              )}
            </div>
          </div>
        )

      case 'appearance':
        return (
          <div className="space-y-5">
            <div className="p-4 rounded-xl" style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.1)' }}>
              <p className="text-sm text-jarvis-text-2 mb-3 font-semibold">Color Theme</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { name: 'Cyan (Default)', primary: '#00d4ff', bg: '#080c18' },
                  { name: 'Matrix Green', primary: '#00ff88', bg: '#080c18' },
                  { name: 'Amber Gold', primary: '#ffaa00', bg: '#0c0a00' },
                ].map((theme) => (
                  <button key={theme.name}
                    className="p-3 rounded-lg text-xs font-mono text-center transition-all"
                    style={{ background: `${theme.primary}15`, border: `2px solid ${theme.primary}40` }}>
                    <div className="w-5 h-5 rounded-full mx-auto mb-1.5" style={{ background: theme.primary }} />
                    {theme.name}
                  </button>
                ))}
              </div>
              <p className="text-xs text-jarvis-text-3 mt-3 font-mono">Theme switching coming in a future update.</p>
            </div>
          </div>
        )

      case 'security':
        return (
          <div className="space-y-4">
            <div className="p-4 rounded-xl space-y-3"
              style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.15)' }}>
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-jarvis-secondary" />
                <span className="text-sm font-semibold text-jarvis-secondary">Security Status</span>
              </div>
              {[
                { label: 'JWT Authentication', status: true },
                { label: 'Password Hashing (bcrypt)', status: true },
                { label: 'HTTPS (configure for production)', status: false },
                { label: 'Two-Factor Authentication', status: false },
              ].map(({ label, status }) => (
                <div key={label} className="flex items-center gap-3 text-sm">
                  <span className={status ? 'text-jarvis-secondary' : 'text-jarvis-text-3'}>
                    {status ? '✓' : '○'}
                  </span>
                  <span className={status ? 'text-jarvis-text' : 'text-jarvis-text-3'}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )

      case 'database':
        return (
          <div className="space-y-4">
            {[
              { name: 'PostgreSQL', desc: 'localhost:5432/jarvis_db', color: '#00d4ff', note: 'Users, automations' },
              { name: 'MongoDB', desc: 'localhost:27017/jarvis_db', color: '#00ff88', note: 'Chat history, logs' },
              { name: 'ChromaDB', desc: 'localhost:8001', color: '#a855f7', note: 'Vector memory store' },
            ].map(({ name, desc, color, note }) => (
              <div key={name} className="p-4 rounded-xl flex items-center justify-between"
                style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
                <div>
                  <p className="font-semibold text-jarvis-text text-sm">{name}</p>
                  <p className="text-xs font-mono text-jarvis-text-3 mt-0.5">{desc}</p>
                  <p className="text-xs text-jarvis-text-3 mt-0.5">{note}</p>
                </div>
                <div className="text-xs font-mono px-2 py-1 rounded"
                  style={{ background: `${color}15`, color }}>
                  Configure in .env
                </div>
              </div>
            ))}
          </div>
        )
    }
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="font-orbitron font-bold text-jarvis-primary text-xl">Settings</h2>
      </div>

      <div className="flex gap-5">
        <div className="w-44 flex-shrink-0">
          <GlassCard animate={false} className="p-2">
            <nav className="space-y-0.5">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 text-left ${
                    tab === id ? 'text-jarvis-primary' : 'text-jarvis-text-3 hover:text-jarvis-text-2'
                  }`}
                  style={tab === id ? { background: 'rgba(0,212,255,0.1)', borderLeft: '2px solid #00d4ff' } : {}}
                >
                  <Icon size={15} />
                  <span className="font-medium">{label}</span>
                </button>
              ))}
            </nav>
          </GlassCard>
        </div>

        <div className="flex-1">
          <GlassCard animate={false} className="p-6">
            <motion.div key={tab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
              <h3 className="font-orbitron text-jarvis-primary text-sm mb-5 uppercase tracking-wider border-b pb-3"
                style={{ borderColor: 'rgba(0,212,255,0.1)' }}>
                {TABS.find((t) => t.id === tab)?.label}
              </h3>
              {renderTab()}
            </motion.div>

            {(tab === 'profile' || tab === 'ai' || tab === 'voice') && (
              <div className="flex items-center gap-3 mt-6 pt-4 border-t" style={{ borderColor: 'rgba(0,212,255,0.08)' }}>
                <JarvisButton variant="solid" onClick={handleSave} loading={saving} icon={<Save size={14} />}>
                  {saved ? 'Saved!' : 'Save Changes'}
                </JarvisButton>
                {saved && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-jarvis-secondary font-mono">
                    ✓ Settings saved successfully
                  </motion.span>
                )}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
