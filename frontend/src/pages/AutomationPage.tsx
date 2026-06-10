import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Plus, Play, Pause, Trash2, Clock, Calendar, MousePointer, ChevronDown,
  Bot, Send, Loader2, CheckCircle2, AlertCircle, Sparkles, LayoutList
} from 'lucide-react'
import { automationAPI } from '@/services/api'
import GlassCard from '@/components/ui/GlassCard'
import JarvisButton from '@/components/ui/JarvisButton'
import type { Automation } from '@/types'

const TRIGGER_ICONS: Record<string, React.ElementType> = {
  schedule: Clock,
  event: MousePointer,
  manual: Play,
}

const TRIGGER_COLORS: Record<string, string> = {
  schedule: '#00d4ff',
  event: '#a855f7',
  manual: '#00ff88',
}

const TEMPLATES = [
  { name: 'Daily Briefing',   trigger_type: 'schedule', trigger_config: { cron: '0 9 * * *' },   actions: [{ type: 'ai_summary', config: {} }],           description: 'Get an AI-generated morning briefing every day at 9am.' },
  { name: 'Auto Summarize',   trigger_type: 'event',    trigger_config: { event: 'chat_end' },    actions: [{ type: 'summarize_chat', config: {} }],       description: 'Automatically summarize chat sessions when they end.' },
  { name: 'Memory Backup',    trigger_type: 'schedule', trigger_config: { cron: '0 0 * * 0' },   actions: [{ type: 'export_memory', config: {} }],        description: 'Weekly backup of your JARVIS memory to a JSON file.' },
  { name: 'Task Reminder',    trigger_type: 'schedule', trigger_config: { cron: '0 17 * * *' },  actions: [{ type: 'remind', config: { message: 'End of day check-in' } }], description: 'Daily 5pm reminder for end-of-day tasks.' },
]

function AutomationCard({ auto, onToggle, onDelete, onRun }: {
  auto: Automation
  onToggle: (id: string, active: boolean) => void
  onDelete: (id: string) => void
  onRun: (id: string) => void
}) {
  const Icon = TRIGGER_ICONS[auto.trigger_type] || Zap
  const color = TRIGGER_COLORS[auto.trigger_type] || '#00d4ff'

  return (
    <motion.div layout className="glass-card p-5 group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
            <Icon size={16} style={{ color }} />
          </div>
          <div>
            <h4 className="font-semibold text-jarvis-text text-sm">{auto.name}</h4>
            <p className="text-[10px] font-mono text-jarvis-text-3 mt-0.5 uppercase">{auto.trigger_type}</p>
          </div>
        </div>

        {/* Toggle */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onRun(auto.id)}
            className="p-1.5 rounded text-jarvis-text-3 hover:text-jarvis-secondary transition-colors"
            title="Run now"
          >
            <Play size={13} />
          </button>
          <button
            onClick={() => onToggle(auto.id, !auto.is_active)}
            className="p-1.5 rounded text-jarvis-text-3 hover:text-jarvis-primary transition-colors"
          >
            {auto.is_active ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button
            onClick={() => onDelete(auto.id)}
            className="p-1.5 rounded text-jarvis-text-3 hover:text-jarvis-danger transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {auto.description && (
        <p className="text-xs text-jarvis-text-2 mb-3 leading-relaxed">{auto.description}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full ${
            auto.is_active
              ? 'text-jarvis-secondary'
              : 'text-jarvis-text-3'
          }`}
            style={{
              background: auto.is_active ? 'rgba(0,255,136,0.1)' : 'rgba(100,116,139,0.1)',
              border: `1px solid ${auto.is_active ? 'rgba(0,255,136,0.25)' : 'rgba(100,116,139,0.2)'}`,
            }}>
            {auto.is_active ? '● Active' : '○ Inactive'}
          </span>
          <span className="text-[10px] text-jarvis-text-3 font-mono">
            {auto.run_count} runs
          </span>
        </div>
        {auto.last_run && (
          <span className="text-[10px] text-jarvis-text-3 font-mono">
            Last: {new Date(auto.last_run).toLocaleDateString()}
          </span>
        )}
      </div>
    </motion.div>
  )
}

export default function AutomationPage() {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', trigger_type: 'manual' })

  // Nexus-6 Agent State
  const [agentGoal, setAgentGoal] = useState('')
  const [agentRunning, setAgentRunning] = useState(false)
  const [agentResult, setAgentResult] = useState<any>(null)
  const [showAgent, setShowAgent] = useState(false)

  useEffect(() => {
    automationAPI.list()
      .then((res) => setAutomations(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSolveGoal = async () => {
    if (!agentGoal.trim()) return
    setAgentRunning(true)
    setAgentResult(null)
    try {
      const res = await automationAPI.solve(agentGoal)
      setAgentResult(res.data)
    } catch (err) {
      console.error("Agent failed", err)
      setAgentResult({ status: 'error', message: 'Nexus-6 Orchestrator failed to initialize.' })
    } finally {
      setAgentRunning(false)
    }
  }

  const handleCreate = async () => {
    if (!form.name.trim()) return
    const res = await automationAPI.create({
      name: form.name,
      description: form.description,
      trigger_type: form.trigger_type,
      actions: [],
      is_active: true,
    })
    setAutomations((prev) => [...prev, res.data])
    setForm({ name: '', description: '', trigger_type: 'manual' })
    setShowCreate(false)
  }

  const handleCreateFromTemplate = async (template: (typeof TEMPLATES)[0]) => {
    const res = await automationAPI.create({
      name: template.name,
      description: template.description,
      trigger_type: template.trigger_type,
      trigger_config: template.trigger_config,
      actions: template.actions,
      is_active: true,
    })
    setAutomations((prev) => [...prev, res.data])
    setShowTemplates(false)
  }

  const handleToggle = async (id: string, active: boolean) => {
    const res = await automationAPI.update(id, { is_active: active })
    setAutomations((prev) => prev.map((a) => a.id === id ? { ...a, is_active: active } : a))
  }

  const handleDelete = async (id: string) => {
    await automationAPI.delete(id)
    setAutomations((prev) => prev.filter((a) => a.id !== id))
  }

  const handleRun = async (id: string) => {
    const res = await automationAPI.run(id)
    setAutomations((prev) => prev.map((a) => a.id === id ? { ...a, run_count: res.data.run_count } : a))
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,170,0,0.1)', border: '1px solid rgba(255,170,0,0.3)' }}>
            <Zap size={20} className="text-jarvis-accent" />
          </div>
          <div>
            <h2 className="font-orbitron font-bold text-jarvis-primary">Automations</h2>
            <p className="text-jarvis-text-3 text-xs font-mono">{automations.length} workflows configured</p>
          </div>
        </div>
        <div className="flex gap-3">
          <JarvisButton 
            variant="ghost" 
            className={showAgent ? 'bg-jarvis-primary/20 text-jarvis-primary' : ''}
            onClick={() => setShowAgent(!showAgent)} 
            icon={<Bot size={14} />}
          >
            Nexus-6 AI
          </JarvisButton>
          <JarvisButton variant="ghost" onClick={() => setShowTemplates(!showTemplates)} icon={<ChevronDown size={14} />}>
            Templates
          </JarvisButton>
          <JarvisButton onClick={() => setShowCreate(!showCreate)} icon={<Plus size={14} />}>
            New Workflow
          </JarvisButton>
        </div>
      </div>

      {/* Nexus-6 Agent Solver */}
      <AnimatePresence>
        {showAgent && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <GlassCard glow className="p-6 border-jarvis-primary/30 shadow-[0_0_20px_rgba(0,212,255,0.1)]">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-jarvis-primary/10 rounded-lg border border-jarvis-primary/20">
                    <Sparkles className="text-jarvis-primary" size={20} />
                 </div>
                 <div>
                    <h3 className="font-orbitron text-white text-sm font-bold uppercase tracking-widest">Nexus-6 Multi-Agent Solver</h3>
                    <p className="text-[10px] text-jarvis-text-3 font-mono uppercase">Autonomous Goal Decomposition & Execution</p>
                 </div>
              </div>

              <div className="flex gap-3 mb-6">
                <input 
                  value={agentGoal}
                  onChange={(e) => setAgentGoal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSolveGoal()}
                  placeholder="Describe a complex goal (e.g., 'Research AI agents and write a summary script')..."
                  className="flex-1 bg-jarvis-bg-2 border border-jarvis-border/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-jarvis-primary/50 transition-all shadow-inner"
                />
                <button 
                  onClick={handleSolveGoal}
                  disabled={agentRunning || !agentGoal.trim()}
                  className="px-6 rounded-xl bg-jarvis-primary text-jarvis-bg font-bold text-xs uppercase tracking-widest hover:shadow-[0_0_15px_rgba(0,212,255,0.4)] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {agentRunning ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {agentRunning ? 'Solving...' : 'Execute'}
                </button>
              </div>

              {agentResult && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                   <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-mono text-jarvis-text-3 uppercase tracking-widest">Execution Log</span>
                        {agentResult.metrics && (
                          <div className="flex items-center gap-2">
                             <span className="text-[9px] bg-jarvis-primary/5 text-jarvis-primary px-1.5 py-0.5 rounded border border-jarvis-primary/10 font-mono">
                               Tasks: {agentResult.metrics.total_tasks}
                             </span>
                             <span className="text-[9px] bg-jarvis-secondary/5 text-jarvis-secondary px-1.5 py-0.5 rounded border border-jarvis-secondary/10 font-mono">
                               ETA: {agentResult.metrics.estimated_completion_time}
                             </span>
                          </div>
                        )}
                      </div>
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${agentResult.status === 'success' ? 'bg-jarvis-secondary/10 text-jarvis-secondary border border-jarvis-secondary/20' : 'bg-jarvis-danger/10 text-jarvis-danger border border-jarvis-danger/20'}`}>
                        {agentResult.status}
                      </span>
                   </div>

                   {agentResult.execution_history ? (
                     <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {agentResult.execution_history.map((step: any, idx: number) => (
                          <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                             <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                   <div className="w-6 h-6 rounded bg-jarvis-primary/10 flex items-center justify-center text-jarvis-primary">
                                      <LayoutList size={12} />
                                   </div>
                                   <span className="text-[10px] font-mono text-white font-bold uppercase tracking-wider">{step.agent} Agent</span>
                                </div>
                                <CheckCircle2 size={14} className="text-jarvis-secondary" />
                             </div>
                             <p className="text-xs text-jarvis-text-2 font-medium mb-3">{step.task}</p>
                             <div className="p-3 bg-black/30 rounded-lg border border-white/5">
                                <p className="text-[10px] text-jarvis-text-3 font-mono whitespace-pre-wrap leading-relaxed">
                                  {typeof step.result === 'object' ? JSON.stringify(step.result, null, 2) : step.result}
                                </p>
                             </div>
                          </div>
                        ))}
                     </div>
                   ) : (
                     <div className="flex items-center gap-3 p-4 bg-jarvis-danger/10 border border-jarvis-danger/20 rounded-xl text-jarvis-danger text-xs">
                        <AlertCircle size={16} />
                        {agentResult.message}
                     </div>
                   )}
                </motion.div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Templates */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <GlassCard animate={false} className="p-5">
              <h3 className="font-orbitron text-jarvis-primary text-sm mb-4 uppercase tracking-wider">Workflow Templates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {TEMPLATES.map((t) => {
                  const Icon = TRIGGER_ICONS[t.trigger_type] || Zap
                  const color = TRIGGER_COLORS[t.trigger_type] || '#00d4ff'
                  return (
                    <motion.button
                      key={t.name}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleCreateFromTemplate(t)}
                      className="text-left p-4 rounded-xl transition-all"
                      style={{ background: `${color}08`, border: `1px solid ${color}20` }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon size={14} style={{ color }} />
                        <span className="font-semibold text-sm text-jarvis-text">{t.name}</span>
                      </div>
                      <p className="text-xs text-jarvis-text-3">{t.description}</p>
                    </motion.button>
                  )
                })}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <GlassCard animate={false} glow className="p-5">
              <h3 className="font-orbitron text-jarvis-primary text-sm mb-4 uppercase tracking-wider">New Automation</h3>
              <div className="space-y-3">
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Automation name" className="input-jarvis w-full" />
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Description (optional)" rows={2} className="input-jarvis resize-none w-full" />
                <select value={form.trigger_type} onChange={(e) => setForm((f) => ({ ...f, trigger_type: e.target.value }))}
                  className="input-jarvis w-full">
                  <option value="manual">Manual trigger</option>
                  <option value="schedule">Scheduled (cron)</option>
                  <option value="event">Event-based</option>
                </select>
                <div className="flex gap-3">
                  <JarvisButton variant="solid" onClick={handleCreate} icon={<Plus size={14} />}>Create</JarvisButton>
                  <JarvisButton variant="ghost" onClick={() => setShowCreate(false)}>Cancel</JarvisButton>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Automations grid */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="spinner-jarvis" /></div>
      ) : automations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Zap size={48} className="text-jarvis-text-3 mb-4 opacity-40" />
          <p className="font-orbitron text-jarvis-text-3">No automations yet</p>
          <p className="text-jarvis-text-3 text-sm mt-1">Create a workflow or pick a template to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {automations.map((auto) => (
            <AutomationCard key={auto.id} auto={auto} onToggle={handleToggle} onDelete={handleDelete} onRun={handleRun} />
          ))}
        </div>
      )}
    </div>
  )
}
