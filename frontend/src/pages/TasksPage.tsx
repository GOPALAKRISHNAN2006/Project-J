import { useState, useEffect } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { 
  Layout, Calendar, List, Plus, Trash2, 
  CheckCircle2, Clock, AlertCircle, ChevronRight,
  Filter, MoreVertical, GripVertical, Settings, Sparkles
} from 'lucide-react'
import GlassCard from '@/components/ui/GlassCard'
import JarvisButton from '@/components/ui/JarvisButton'

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'

interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: number
  due_date?: string
}

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'todo', label: 'To Do', color: '#00d4ff' },
  { id: 'in_progress', label: 'In Progress', color: '#ffaa00' },
  { id: 'review', label: 'Review', color: '#8844ff' },
  { id: 'done', label: 'Done', color: '#00ff88' },
]

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'Integrate Google Workspace', description: 'Setup OAuth and Gmail/Calendar services.', status: 'in_progress', priority: 2 },
    { id: '2', title: 'Implement Kanban Board', description: 'Create interactive drag-and-drop task management.', status: 'in_progress', priority: 1 },
    { id: '3', title: 'AI Automation Testing', description: 'Test autonomous agent workflows.', status: 'todo', priority: 0 },
    { id: '4', title: 'Security Audit', description: 'Review API key storage and OAuth flows.', status: 'review', priority: 2 },
  ])
  
  const [view, setView] = useState<'kanban' | 'timeline' | 'calendar'>('kanban')
  const [showCreate, setShowCreate] = useState(false)

  const moveTask = (id: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t))
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-jarvis-primary/10 border border-jarvis-primary/20">
              <Layout className="text-jarvis-primary" size={20} />
            </div>
            <h1 className="font-orbitron text-xl font-bold text-white tracking-widest uppercase">Neural Task Engine</h1>
          </div>
          <p className="text-[10px] text-jarvis-text-3 font-mono uppercase tracking-[0.2em] opacity-60">Autonomous Workflow Orchestrator</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-black/40 border border-white/5 rounded-xl">
             <button 
               onClick={() => setView('kanban')}
               className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase transition-all ${view === 'kanban' ? 'bg-jarvis-primary text-jarvis-bg font-bold shadow-[0_0_10px_rgba(0,212,255,0.3)]' : 'text-jarvis-text-3 hover:text-white'}`}
             >
               Kanban
             </button>
             <button 
               onClick={() => setView('timeline')}
               className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase transition-all ${view === 'timeline' ? 'bg-jarvis-primary text-jarvis-bg font-bold shadow-[0_0_10px_rgba(0,212,255,0.3)]' : 'text-jarvis-text-3 hover:text-white'}`}
             >
               Timeline
             </button>
             <button 
               onClick={() => setView('calendar')}
               className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase transition-all ${view === 'calendar' ? 'bg-jarvis-primary text-jarvis-bg font-bold shadow-[0_0_10px_rgba(0,212,255,0.3)]' : 'text-jarvis-text-3 hover:text-white'}`}
             >
               Calendar
             </button>
          </div>
          <JarvisButton onClick={() => setShowCreate(true)} icon={<Plus size={14} />}>New Objective</JarvisButton>
        </div>
      </div>

      {/* View Content */}
      <div className="min-h-[600px]">
        {view === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full">
            {COLUMNS.map(col => (
              <div key={col.id} className="flex flex-col gap-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: col.color }} />
                    <span className="text-[10px] font-mono text-white font-bold uppercase tracking-widest">{col.label}</span>
                  </div>
                  <span className="text-[10px] font-mono text-jarvis-text-3 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                    {tasks.filter(t => t.status === col.id).length}
                  </span>
                </div>

                <div className="flex-1 p-2 bg-white/[0.02] border border-dashed border-white/5 rounded-2xl min-h-[400px]">
                  <AnimatePresence mode="popLayout">
                    {tasks.filter(t => t.status === col.id).map(task => (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="mb-4"
                      >
                        <GlassCard className="p-4 border-white/5 hover:border-jarvis-primary/30 transition-all cursor-grab active:cursor-grabbing group">
                          <div className="flex justify-between items-start mb-2">
                            <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                              task.priority === 2 ? 'bg-jarvis-danger/10 text-jarvis-danger border-jarvis-danger/20' :
                              task.priority === 1 ? 'bg-jarvis-primary/10 text-jarvis-primary border-jarvis-primary/20' :
                              'bg-jarvis-text-3/10 text-jarvis-text-3 border-jarvis-text-3/20'
                            }`}>
                              {task.priority === 2 ? 'Priority High' : task.priority === 1 ? 'Priority Med' : 'Priority Low'}
                            </span>
                            <MoreVertical size={12} className="text-jarvis-text-3 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" />
                          </div>
                          <h4 className="text-xs font-bold text-white mb-1">{task.title}</h4>
                          <p className="text-[10px] text-jarvis-text-3 line-clamp-2 font-mono leading-relaxed mb-4">{task.description}</p>
                          
                          <div className="flex items-center justify-between mt-auto">
                            <div className="flex -space-x-2">
                               <div className="w-5 h-5 rounded-full bg-jarvis-primary flex items-center justify-center border border-black text-[8px] font-bold text-black">J</div>
                               <div className="w-5 h-5 rounded-full bg-jarvis-secondary flex items-center justify-center border border-black text-[8px] font-bold text-black">A</div>
                            </div>
                            <div className="flex gap-1">
                               {COLUMNS.filter(c => c.id !== task.status).map(c => (
                                 <button 
                                   key={c.id}
                                   onClick={() => moveTask(task.id, c.id)}
                                   className="w-5 h-5 rounded bg-white/5 border border-white/5 flex items-center justify-center text-jarvis-text-3 hover:text-jarvis-primary hover:border-jarvis-primary/30 transition-all"
                                   title={`Move to ${c.label}`}
                                 >
                                   <ChevronRight size={10} />
                                 </button>
                               ))}
                            </div>
                          </div>
                        </GlassCard>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'timeline' && (
          <GlassCard className="p-8 border-white/5">
             <div className="flex items-center gap-4 mb-8">
                <Sparkles className="text-jarvis-primary" size={20} />
                <h3 className="font-orbitron text-sm font-bold text-white uppercase tracking-widest">Temporal Objective Mapping</h3>
             </div>
             <div className="space-y-8 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-jarvis-primary/50 before:via-white/5 before:to-transparent">
                {tasks.map((t, i) => (
                  <div key={t.id} className="relative pl-10">
                     <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-jarvis-bg border-2 border-jarvis-primary" />
                     <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-all">
                        <div>
                           <h4 className="text-xs font-bold text-white uppercase mb-1">{t.title}</h4>
                           <p className="text-[10px] text-jarvis-text-3 font-mono">ETA: {1 + i} days · Assigned to Agent: Research</p>
                        </div>
                        <span className="text-[9px] font-mono text-jarvis-primary bg-jarvis-primary/5 px-2 py-1 rounded border border-jarvis-primary/20">Phase {i+1}</span>
                     </div>
                  </div>
                ))}
             </div>
          </GlassCard>
        )}
      </div>
    </div>
  )
}
