import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Search, Plus, Trash2, Tag, Database, AlertCircle } from 'lucide-react'
import { memoryAPI } from '@/services/api'
import GlassCard from '@/components/ui/GlassCard'
import JarvisButton from '@/components/ui/JarvisButton'
import type { MemoryEntry } from '@/types'

export default function MemoryPage() {
  const [memories, setMemories] = useState<MemoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)

  const [showAdd, setShowAdd] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newTag, setNewTag] = useState('')
  const [adding, setAdding] = useState(false)

  const loadMemories = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await memoryAPI.list()
      setMemories(res.data)
    } catch {
      setError('ChromaDB is not available. Start the Docker services to use memory.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadMemories() }, [])

  const handleSearch = async () => {
    if (!searchQuery.trim()) { loadMemories(); return }
    setSearching(true)
    try {
      const res = await memoryAPI.search(searchQuery)
      setMemories(res.data)
    } catch {
      setError('Search failed. ChromaDB may be offline.')
    } finally {
      setSearching(false)
    }
  }

  const handleAdd = async () => {
    if (!newContent.trim()) return
    setAdding(true)
    try {
      const meta = newTag ? { tag: newTag } : {}
      const res = await memoryAPI.create({ content: newContent, metadata: meta })
      setMemories((prev) => [res.data, ...prev])
      setNewContent('')
      setNewTag('')
      setShowAdd(false)
    } catch {
      alert('Failed to add memory. ChromaDB may be offline.')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    await memoryAPI.delete(id).catch(() => { })
    setMemories((prev) => prev.filter((m) => m.id !== id))
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)' }}>
            <Brain size={20} className="text-jarvis-secondary" />
          </div>
          <div>
            <h2 className="font-orbitron font-bold text-jarvis-primary">Memory Bank</h2>
            <p className="text-jarvis-text-3 text-xs font-mono">{memories.length} entries in vector store</p>
          </div>
        </div>
        <JarvisButton onClick={() => setShowAdd(!showAdd)} icon={<Plus size={14} />}>
          Add Memory
        </JarvisButton>
      </div>

      {/* Add Memory Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <GlassCard animate={false} glow className="p-5">
              <h3 className="font-orbitron text-jarvis-primary text-sm mb-4 uppercase tracking-wider">New Memory Entry</h3>
              <div className="space-y-3">
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Enter information to store in JARVIS memory…"
                  rows={3}
                  className="input-jarvis resize-none w-full"
                />
                <div className="flex gap-3">
                  <input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Tag (optional)"
                    className="input-jarvis flex-1"
                  />
                  <JarvisButton variant="solid" onClick={handleAdd} loading={adding} icon={<Plus size={14} />}>
                    Store
                  </JarvisButton>
                  <JarvisButton variant="ghost" onClick={() => setShowAdd(false)}>
                    Cancel
                  </JarvisButton>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <GlassCard animate={false} className="p-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-jarvis-text-3" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Semantic search across memories…"
              className="input-jarvis pl-9 w-full"
            />
          </div>
          <JarvisButton onClick={handleSearch} loading={searching} icon={<Search size={14} />}>
            Search
          </JarvisButton>
          {searchQuery && (
            <JarvisButton variant="ghost" onClick={() => { setSearchQuery(''); loadMemories() }}>
              Clear
            </JarvisButton>
          )}
        </div>
      </GlassCard>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl"
          style={{ background: 'rgba(255,68,85,0.08)', border: '1px solid rgba(255,68,85,0.2)', color: '#ff4455' }}>
          <AlertCircle size={16} />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Memory Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="spinner-jarvis" /></div>
      ) : memories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Database size={48} className="text-jarvis-text-3 mb-4 opacity-40" />
          <p className="font-orbitron text-jarvis-text-3">No memories stored</p>
          <p className="text-jarvis-text-3 text-sm mt-1">Add your first memory entry above</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {memories.map((mem, i) => (
            <motion.div
              key={mem.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="group glass-card-hover p-4 relative"
            >
              {/* Distance score */}
              {mem.distance !== undefined && (
                <div className="absolute top-3 right-3 text-[10px] font-mono px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(0,212,255,0.1)', color: '#00d4ff' }}>
                  {(1 - mem.distance).toFixed(2)} match
                </div>
              )}

              <p className="text-sm text-jarvis-text leading-relaxed mb-3 pr-16">{String(mem.content)}</p>

              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1.5">
                  {!!mem.metadata?.tag && (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono"
                      style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.2)', color: '#00ff88' }}>
                      <Tag size={8} /> {String(mem.metadata.tag)}
                    </span>
                  )}
                  <span className="text-[10px] text-jarvis-text-3 font-mono">{mem.id.slice(0, 8)}…</span>
                </div>
                <button
                  onClick={() => handleDelete(mem.id)}
                  className="opacity-0 group-hover:opacity-100 text-jarvis-text-3 hover:text-jarvis-danger transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
