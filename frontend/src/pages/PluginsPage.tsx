import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Puzzle, Search, Download, Trash2, 
  ToggleLeft, ToggleRight, ExternalLink, 
  ShieldCheck, Info, Package, Filter, Sparkles
} from 'lucide-react'
import { pluginsAPI } from '@/services/api'
import GlassCard from '@/components/ui/GlassCard'
import JarvisButton from '@/components/ui/JarvisButton'

interface Plugin {
  id: string
  name: string
  description: string
  version: string
  author: string
  is_enabled: boolean
}

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<Plugin[]>([
    { id: 'p1', name: 'Web Research Pro', description: 'Advanced deep-web scraping and summarization.', version: '1.2.0', author: 'Nexus Team', is_enabled: true },
    { id: 'p2', name: 'Code Auditor', description: 'Automated security and style auditing for Python.', version: '0.9.5', author: 'OpenSource Foundation', is_enabled: false },
    { id: 'p3', name: 'Temporal Sync', description: 'Deep integration with Notion and Obsidian.', version: '2.0.1', author: 'SyncLabs', is_enabled: true },
  ])
  
  const [view, setView] = useState<'installed' | 'marketplace'>('installed')
  const [searchQuery, setSearchQuery] = useState('')

  const togglePlugin = async (id: string) => {
    const plugin = plugins.find(p => p.id === id)
    if (!plugin) return
    
    // Simulate API call
    setPlugins(prev => prev.map(p => p.id === id ? { ...p, is_enabled: !p.is_enabled } : p))
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-jarvis-primary/10 border border-jarvis-primary/20">
              <Puzzle className="text-jarvis-primary" size={20} />
            </div>
            <h1 className="font-orbitron text-xl font-bold text-white tracking-widest uppercase">Plugin Integrations</h1>
          </div>
          <p className="text-[10px] text-jarvis-text-3 font-mono uppercase tracking-[0.2em] opacity-60">Modular Expansion Core</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-black/40 border border-white/5 rounded-xl">
             <button 
               onClick={() => setView('installed')}
               className={`px-4 py-1.5 rounded-lg text-[10px] font-mono uppercase transition-all ${view === 'installed' ? 'bg-jarvis-primary text-jarvis-bg font-bold shadow-[0_0_10px_rgba(0,212,255,0.3)]' : 'text-jarvis-text-3 hover:text-white'}`}
             >
               My Library
             </button>
             <button 
               onClick={() => setView('marketplace')}
               className={`px-4 py-1.5 rounded-lg text-[10px] font-mono uppercase transition-all ${view === 'marketplace' ? 'bg-jarvis-primary text-jarvis-bg font-bold shadow-[0_0_10px_rgba(0,212,255,0.3)]' : 'text-jarvis-text-3 hover:text-white'}`}
             >
               Marketplace
             </button>
          </div>
          <JarvisButton variant="ghost" icon={<ExternalLink size={14} />}>API Docs</JarvisButton>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
         <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-jarvis-text-3" size={16} />
         <input 
           value={searchQuery}
           onChange={(e) => setSearchQuery(e.target.value)}
           placeholder={view === 'installed' ? "Search your installed plugins..." : "Search the Nexus-6 marketplace..."}
           className="w-full bg-black/40 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-jarvis-primary/30 transition-all shadow-inner"
         />
      </div>

      {/* Plugin Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {view === 'marketplace' && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="lg:col-span-3 mb-4">
              <div className="flex items-center gap-3 p-4 bg-jarvis-primary/5 border border-jarvis-primary/20 rounded-2xl">
                 <Sparkles className="text-jarvis-primary" size={18} />
                 <p className="text-[10px] font-mono text-white uppercase">Featured: AI Security Shield - real-time sandbox for plugin execution.</p>
              </div>
           </motion.div>
         )}

         <AnimatePresence mode="popLayout">
           {plugins.map(p => (
             <motion.div key={p.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
               <GlassCard className="p-6 border-white/5 hover:border-white/10 transition-all h-full flex flex-col group">
                  <div className="flex justify-between items-start mb-4">
                     <div className="p-3 rounded-xl bg-white/5 border border-white/5 group-hover:border-jarvis-primary/20 transition-all">
                        <Package size={20} className="text-jarvis-text-3 group-hover:text-jarvis-primary" />
                     </div>
                     <button onClick={() => togglePlugin(p.id)} className="transition-all hover:scale-110">
                        {p.is_enabled ? <ToggleRight size={28} className="text-jarvis-primary" /> : <ToggleLeft size={28} className="text-jarvis-text-3" />}
                     </button>
                  </div>
                  
                  <div className="mb-6 flex-1">
                     <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-white text-sm">{p.name}</h3>
                        <span className="text-[8px] bg-white/5 px-1.5 py-0.5 rounded border border-white/5 text-jarvis-text-3 font-mono">v{p.version}</span>
                     </div>
                     <p className="text-[10px] text-jarvis-text-3 font-mono leading-relaxed">{p.description}</p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                     <div className="flex flex-col">
                        <span className="text-[8px] uppercase tracking-tighter text-jarvis-text-3 font-mono">Developed By</span>
                        <span className="text-[9px] font-bold text-white font-mono">{p.author}</span>
                     </div>
                     <div className="flex gap-2">
                        <button className="p-2 rounded-lg bg-white/5 border border-white/5 text-jarvis-text-3 hover:text-white transition-all">
                           <ShieldCheck size={14} />
                        </button>
                        <button className="p-2 rounded-lg bg-white/5 border border-white/5 text-jarvis-text-3 hover:text-white transition-all">
                           <Info size={14} />
                        </button>
                     </div>
                  </div>
               </GlassCard>
             </motion.div>
           ))}
         </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="flex justify-center pt-10">
         <div className="flex items-center gap-6 px-8 py-3 bg-black/40 border border-white/5 rounded-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-jarvis-primary" />
               <span className="text-[9px] font-mono text-jarvis-text-3 uppercase">API v1.0.4 - STABLE</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-jarvis-secondary" />
               <span className="text-[9px] font-mono text-jarvis-text-3 uppercase">Sandbox: ACTIVE</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-jarvis-accent" />
               <span className="text-[9px] font-mono text-jarvis-text-3 uppercase">Plugins: {plugins.filter(p => p.is_enabled).length} ACTIVE</span>
            </div>
         </div>
      </div>
    </div>
  )
}
