import { Calendar, Bell, Clock } from 'lucide-react'
import GlassCard from './GlassCard'
import { motion } from 'framer-motion'

export default function RemindersWidget() {
  const reminders = [
    { id: 1, title: 'Project-J Deployment', time: '14:00', type: 'work' },
    { id: 2, title: 'Meeting with Tony', time: '16:30', type: 'call' },
    { id: 3, title: 'System Diagnostics', time: '20:00', type: 'system' },
  ]

  return (
    <GlassCard className="p-4" delay={0.4}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-orbitron font-bold text-jarvis-primary uppercase tracking-widest">Reminders</h4>
        <Bell size={14} className="text-jarvis-text-3" />
      </div>

      <div className="space-y-3">
        {reminders.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="flex items-center gap-3 p-2 rounded-lg bg-jarvis-primary/5 border border-jarvis-primary/10"
          >
            <div className="w-8 h-8 rounded bg-jarvis-primary/10 flex items-center justify-center">
              <Clock size={14} className="text-jarvis-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-jarvis-text truncate">{r.title}</p>
              <p className="text-[10px] text-jarvis-text-3 font-mono">{r.time}</p>
            </div>
          </motion.div>
        ))}
      </div>
      
      <button className="w-full mt-4 py-2 border border-dashed border-jarvis-primary/30 rounded-lg text-[10px] text-jarvis-text-3 hover:text-jarvis-primary hover:border-jarvis-primary/50 transition-colors uppercase tracking-widest font-mono">
        + Add Event
      </button>
    </GlassCard>
  )
}
