import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Plus, Trash2, Bot, User, Copy, Check,
  ChevronDown, Sparkles, StopCircle, Search, Paperclip, X, Image as ImageIcon,
  FileText, Loader2
} from 'lucide-react'
import { chatAPI, settingsAPI } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import GlassCard from '@/components/ui/GlassCard'
import JarvisButton from '@/components/ui/JarvisButton'
import MessageBubble from '@/components/chat/MessageBubble'
import type { ChatMessage, ChatSessionSummary, ChatSession } from '@/types'

// Deprecated static model list; models are fetched from backend

export default function ChatPage() {
  const { sessionId } = useParams<{ sessionId?: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [streamContent, setStreamContent] = useState('')
  // Initialise from auth store, but keep in sync on every user change
  const [model, setModel] = useState(user?.default_model || 'gpt-4o')
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [availableModels, setAvailableModels] = useState<{id: string, name: string}[]>([])

  // Keep model in sync with the authenticated user’s default model
  useEffect(() => {
    if (user?.default_model && user.default_model !== model) {
      setModel(user.default_model)
    }
  }, [user?.default_model])

  // Sync model with the list we fetch from the backend
  useEffect(() => {
    if (availableModels.length > 0) {
      const hasCurrent = availableModels.some(m => m.id === model)
      if (!hasCurrent) {
        setModel(availableModels[0].id)
      }
    }
  }, [availableModels, model])

  // File upload states
  const [pendingFiles, setPendingFiles] = useState<{ id: string, name: string, type: string, url: string }[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Load sessions and models
  useEffect(() => {
    chatAPI.listSessions().then((res) => setSessions(res.data)).catch(() => {})
    settingsAPI.listModels()
      .then((res) => setAvailableModels(res.data.models || []))
      .catch(() => setAvailableModels([]))
  }, [])

  // Load session by ID
  useEffect(() => {
    if (sessionId) {
      chatAPI.getSession(sessionId).then((res) => {
        setActiveSession(res.data)
        setMessages(prev => {
          // If we already have messages for this session (e.g. optimistic UI during stream), don't overwrite with empty
          if (prev.length > 0 && res.data.messages.length === 0) {
            return prev
          }
          return res.data.messages || []
        })
      }).catch(() => navigate('/chat'))
    } else {
      setActiveSession(null)
      setMessages([])
    }
  }, [sessionId, navigate])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamContent])

  const filteredSessions = useMemo(() => {
    if (!searchQuery) return sessions
    return sessions.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [sessions, searchQuery])

  const handleNewChat = async () => {
    const res = await chatAPI.createSession()
    const session = res.data
    setSessions((prev) => [session, ...prev])
    navigate(`/chat/${session.id}`)
  }

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await chatAPI.deleteSession(id).catch(() => {})
    setSessions((prev) => prev.filter((s) => s.id !== id))
    if (sessionId === id) navigate('/chat')
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    try {
      for (const file of Array.from(files)) {
        const res = await chatAPI.upload(file)
        setPendingFiles(prev => [...prev, {
          id: res.data.id,
          name: res.data.filename,
          type: res.data.content_type,
          url: res.data.url
        }])
      }
    } catch (err) {
      console.error("Upload failed", err)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removePendingFile = (id: string) => {
    setPendingFiles(prev => prev.filter(f => f.id !== id))
  }

  const handleSend = async (overrideInput?: string, isRegenerate = false, historyOverride?: ChatMessage[]) => {
    const messageContent = overrideInput || input
    if ((!messageContent.trim() && pendingFiles.length === 0) || streaming) return

    let sid = sessionId
    if (!sid) {
      const res = await chatAPI.createSession({ title: messageContent.slice(0, 50), model })
      const session = res.data
      setSessions((prev) => [session, ...prev])
      navigate(`/chat/${session.id}`)
      sid = session.id
    }

    // Construct message with file info if any
    let finalContent = messageContent
    if (pendingFiles.length > 0) {
      const fileInfos = pendingFiles.map(f => `[File: ${f.name}](${f.url})`).join('\n')
      finalContent = `${messageContent}\n\n${fileInfos}`
    }

    let historyToSend: any[] | undefined = undefined
    if (historyOverride) {
       historyToSend = historyOverride.map(m => ({ role: m.role, content: m.content }))
    }

    if (!isRegenerate && !historyOverride) {
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: finalContent,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMsg])
    }

    setInput('')
    setPendingFiles([])
    setStreaming(true)
    setStreamContent('')

    abortRef.current = new AbortController()

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${useAuthStore.getState().token}`,
        },
        body: JSON.stringify({ 
          message: finalContent, 
          session_id: sid, 
          model, 
          stream: true,
          messages: historyToSend
        }),
        signal: abortRef.current.signal,
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            full += data
            setStreamContent(full)
          }
        }
      }

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: full,
        timestamp: new Date().toISOString(),
        model,
      }
      setMessages((prev) => [...prev, aiMsg])
      setStreamContent('')

      // Update session title in sidebar
      setSessions((prev) => prev.map((s) =>
        s.id === sid ? { ...s, title: messageContent.slice(0, 50) || s.title, message_count: s.message_count + 2 } : s
      ))
    } catch (err) {
      console.error("Chat error", err)
    } finally {
      setStreaming(false)
    }
  }

  const handleRegenerate = () => {
    if (messages.length === 0 || streaming) return
    const lastUserMsgIndex = [...messages].reverse().findIndex(m => m.role === 'user')
    if (lastUserMsgIndex === -1) return
    
    const actualIndex = messages.length - 1 - lastUserMsgIndex
    const lastUserMsg = messages[actualIndex]
    
    // History up to last user message
    const history = messages.slice(0, actualIndex + 1)
    
    setMessages(prev => prev.slice(0, actualIndex + 1))
    handleSend(lastUserMsg.content, true, history)
  }

  const handleEditMessage = (index: number, newContent: string) => {
    if (streaming) return
    
    const editedHistory = messages.slice(0, index)
    const newMsg: ChatMessage = {
      ...messages[index],
      content: newContent,
      timestamp: new Date().toISOString()
    }
    editedHistory.push(newMsg)

    setMessages(editedHistory)
    handleSend(newContent, false, editedHistory)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleStop = () => {
    abortRef.current?.abort()
    setStreaming(false)
  }

  const [messageSearchQuery, setMessageSearchQuery] = useState('')
  const [showMsgSearch, setShowMsgSearch] = useState(false)

  const filteredMessages = useMemo(() => {
    if (!messageSearchQuery.trim()) return messages
    return messages.filter(m => m.content.toLowerCase().includes(messageSearchQuery.toLowerCase()))
  }, [messages, messageSearchQuery])

  return (
    <div className="flex h-full gap-4 relative overflow-hidden">
      {/* Sessions Sidebar */}
      <div className="hidden lg:flex w-72 flex-shrink-0 flex-col gap-4">
        <JarvisButton 
          onClick={handleNewChat} 
          icon={<Plus size={16} />} 
          className="w-full justify-center py-4 bg-jarvis-primary/10 border-jarvis-primary/30"
        >
          Initialize New Matrix
        </JarvisButton>

        {/* Search Bar for Sessions */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-jarvis-primary/20 to-jarvis-secondary/20 rounded-xl blur opacity-30 group-focus-within:opacity-100 transition duration-1000"></div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-jarvis-text-3" />
            <input
              type="text"
              placeholder="Filter Encrypted Archives..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-jarvis-bg/40 border border-jarvis-border/30 rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:border-jarvis-primary/50 transition-all font-mono"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
          {filteredSessions.map((s) => (
            <motion.div
              key={s.id}
              onClick={() => navigate(`/chat/${s.id}`)}
              whileHover={{ x: 4 }}
              className={`group relative flex items-center gap-3 px-4 py-3.5 rounded-xl cursor-pointer transition-all duration-300 ${
                sessionId === s.id ? 'bg-jarvis-primary/10 border border-jarvis-primary/30 shadow-[0_0_15px_rgba(0,212,255,0.1)]' : 'glass-card-hover'
              }`}
            >
              {sessionId === s.id && <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-jarvis-primary rounded-r-full" />}
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold truncate uppercase tracking-wider font-orbitron ${sessionId === s.id ? 'text-jarvis-primary' : 'text-jarvis-text'}`}>
                  {s.title}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                   <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                      <Bot size={10} className="text-jarvis-text-3" />
                      <span className="text-[9px] text-jarvis-text-3 font-mono">{s.model}</span>
                   </div>
                   <span className="text-[9px] text-jarvis-text-3 font-mono opacity-30 uppercase tracking-tighter">{s.message_count} cycles</span>
                </div>
              </div>
              <button
                onClick={(e) => handleDeleteSession(s.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-jarvis-text-3 hover:text-jarvis-danger hover:bg-jarvis-danger/10 transition-all"
                aria-label="Delete chat"
              >
                <Trash2 size={14} />
              </button>
            </motion.div>
          ))}
          {filteredSessions.length === 0 && (
            <div className="text-center py-12 px-4 border border-dashed border-jarvis-border/30 rounded-xl">
              <Search size={24} className="mx-auto text-jarvis-text-3 opacity-20 mb-3" />
              <p className="text-jarvis-text-3 text-[10px] font-mono uppercase tracking-widest">
                {searchQuery ? 'Zero Matches Found' : 'No Active Uplinks'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <GlassCard animate={false} className="flex-1 flex flex-col overflow-hidden p-0 relative border-jarvis-border/20 shadow-2xl">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0 bg-jarvis-bg/40 backdrop-blur-md z-10"
          style={{ borderColor: 'rgba(0,212,255,0.08)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-jarvis-primary/10 border border-jarvis-primary/20 flex items-center justify-center relative overflow-hidden group">
               <div className="absolute inset-0 bg-jarvis-primary/10 animate-pulse" />
               <Bot size={20} className="text-jarvis-primary relative z-10" />
            </div>
            <div className="flex flex-col min-w-0">
               <span className="font-orbitron text-sm font-bold text-white uppercase tracking-widest truncate max-w-[200px] md:max-w-[400px]">
                 {activeSession?.title || 'Neural Interface'}
               </span>
               <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-jarvis-secondary animate-pulse" />
                  <span className="text-[9px] font-mono text-jarvis-text-3 uppercase tracking-widest">Secure Link Active</span>
               </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Message Search Toggle */}
            <div className="relative flex items-center">
               <AnimatePresence>
                 {showMsgSearch && (
                   <motion.div
                     initial={{ width: 0, opacity: 0 }}
                     animate={{ width: 200, opacity: 1 }}
                     exit={{ width: 0, opacity: 0 }}
                     className="absolute right-full mr-2"
                   >
                     <input
                       type="text"
                       placeholder="Search logs..."
                       value={messageSearchQuery}
                       onChange={(e) => setMessageSearchQuery(e.target.value)}
                       autoFocus
                       className="w-full bg-jarvis-bg-2 border border-jarvis-primary/30 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-jarvis-primary"
                     />
                   </motion.div>
                 )}
               </AnimatePresence>
               <button 
                 onClick={() => { setShowMsgSearch(!showMsgSearch); if(showMsgSearch) setMessageSearchQuery('') }}
                 className={`p-2 rounded-lg transition-colors ${showMsgSearch ? 'text-jarvis-primary bg-jarvis-primary/10' : 'text-jarvis-text-3 hover:text-jarvis-text-2'}`}
               >
                 <Search size={16} />
               </button>
            </div>

            {/* Model selector */}
            <div className="relative">
              <button
                onClick={() => setShowModelPicker(!showModelPicker)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold font-mono text-jarvis-primary border border-jarvis-primary/20 bg-jarvis-primary/5 hover:bg-jarvis-primary/10 transition-all uppercase tracking-widest"
              >
                {model}
                <ChevronDown size={12} className={`transition-transform duration-300 ${showModelPicker ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showModelPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 z-50 rounded-xl overflow-hidden shadow-2xl border border-jarvis-border/50 bg-[#0d1526]/95 backdrop-blur-xl min-w-[180px]"
                  >
                    <div className="px-3 py-2 border-b border-jarvis-border/20">
                       <span className="text-[9px] font-mono text-jarvis-text-3 uppercase tracking-widest">Select Core Engine</span>
                    </div>
                    {availableModels.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => { setModel(m.id); setShowModelPicker(false) }}
                        className={`w-full px-4 py-2.5 text-left text-[11px] font-mono transition-all flex items-center justify-between hover:bg-white/5 ${m.id === model ? 'text-jarvis-primary bg-jarvis-primary/5' : 'text-jarvis-text-3'}`}
                      >
                        {m.name}
                        {m.id === model && <div className="w-1.5 h-1.5 rounded-full bg-jarvis-primary shadow-[0_0_8px_#00d4ff]" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar scroll-smooth">
          {messages.length === 0 && !streaming && (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <div className="relative mb-8">
                 <div className="absolute inset-0 bg-jarvis-primary/20 rounded-full blur-3xl animate-pulse" />
                 <motion.div 
                   animate={{ rotate: 360 }} 
                   transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                   className="relative z-10 w-24 h-24 rounded-full border border-dashed border-jarvis-primary/30 flex items-center justify-center"
                 >
                    <Bot size={40} className="text-jarvis-primary opacity-50" />
                 </motion.div>
              </div>
              <h2 className="font-orbitron text-jarvis-primary text-xl font-black mb-3 tracking-[0.3em] uppercase">JARVIS INTERFACE</h2>
              <p className="text-jarvis-text-3 text-xs max-w-sm font-mono leading-relaxed uppercase tracking-widest opacity-60">
                Encrypted uplink established. Neural network synchronized. Awaiting operator input...
              </p>
            </div>
          )}

          {filteredMessages.map((msg, i) => (
            <MessageBubble 
              key={msg.id} 
              msg={msg} 
              isLatest={i === filteredMessages.length - 1 && streaming} 
              onRegenerate={!messageSearchQuery && i === filteredMessages.length - 1 && msg.role === 'assistant' ? handleRegenerate : undefined}
              onEdit={msg.role === 'user' ? (content) => handleEditMessage(messages.indexOf(msg), content) : undefined}
            />
          ))}

          {streaming && !streamContent && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-4 items-start"
            >
              <div className="w-8 h-8 rounded-full border border-jarvis-primary/30 flex items-center justify-center bg-jarvis-primary/5 flex-shrink-0">
                <Loader2 size={14} className="text-jarvis-primary animate-spin" />
              </div>
              <div className="chat-bubble-ai px-5 py-4 flex gap-1.5 items-center bg-jarvis-primary/5 border border-jarvis-primary/10 rounded-2xl rounded-tl-none shadow-inner">
                <span className="w-1.5 h-1.5 bg-jarvis-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-jarvis-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-jarvis-primary rounded-full animate-bounce"></span>
                <span className="ml-2 text-[10px] font-mono text-jarvis-primary/60 uppercase tracking-[0.2em] font-bold">Decoding Matrix...</span>
              </div>
            </motion.div>
          )}

          {streaming && streamContent && (
            <MessageBubble
              msg={{
                id: 'streaming',
                role: 'assistant',
                content: streamContent,
                timestamp: new Date().toISOString(),
              }}
              isLatest
            />
          )}

          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Input area */}
        <div className="px-6 py-5 border-t flex-shrink-0 bg-jarvis-bg/50 backdrop-blur-md" style={{ borderColor: 'rgba(0,212,255,0.08)' }}>
          {/* Pending Files Preview */}
          <AnimatePresence>
            {pendingFiles.length > 0 && (
              <motion.div 
                initial={{ height: 0, opacity: 0, y: 10 }}
                animate={{ height: 'auto', opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: 10 }}
                className="flex flex-wrap gap-2 mb-4"
              >
                {pendingFiles.map(f => (
                  <div key={f.id} className="flex items-center gap-2 pl-2 pr-1 py-1 bg-jarvis-primary/10 border border-jarvis-primary/30 rounded-lg text-[10px] text-jarvis-primary font-mono group">
                    {f.type.startsWith('image/') ? <ImageIcon size={12} /> : <FileText size={12} />}
                    <span className="truncate max-w-[120px] font-bold">{f.name}</span>
                    <button onClick={() => removePendingFile(f.id)} className="p-1 hover:bg-jarvis-danger/20 hover:text-jarvis-danger rounded transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3 items-end max-w-5xl mx-auto">
            <div className="flex-1 relative group bg-jarvis-bg-2/50 rounded-2xl border border-jarvis-border/30 focus-within:border-jarvis-primary/50 transition-all shadow-inner overflow-hidden">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Synchronize with JARVIS… (Shift+Enter for newline)"
                rows={1}
                className="w-full bg-transparent border-none text-sm text-white placeholder-jarvis-text-3 outline-none px-4 py-3.5 leading-relaxed resize-none custom-scrollbar"
                style={{ minHeight: 48, maxHeight: 200 }}
                onInput={(e) => {
                  const target = e.currentTarget
                  target.style.height = 'auto'
                  target.style.height = `${Math.min(target.scrollHeight, 200)}px`
                }}
              />
              <div className="absolute right-3 bottom-2.5 flex items-center gap-1.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  multiple
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className={`p-2 rounded-xl transition-all ${isUploading ? 'text-jarvis-primary' : 'text-jarvis-text-3 hover:text-jarvis-primary hover:bg-jarvis-primary/5'}`}
                  title="Upload Artifacts"
                >
                  {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
                </button>
              </div>
            </div>
            
            <div className="flex-shrink-0">
              {streaming ? (
                <button 
                  onClick={handleStop}
                  className="w-12 h-12 rounded-2xl bg-jarvis-danger/10 border border-jarvis-danger/30 text-jarvis-danger flex items-center justify-center hover:bg-jarvis-danger/20 transition-all group"
                  title="Abort Process"
                >
                   <StopCircle size={20} className="group-active:scale-90 transition-transform" />
                </button>
              ) : (
                <button
                  onClick={() => handleSend()}
                  disabled={(!input.trim() && pendingFiles.length === 0) || isUploading}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
                    (!input.trim() && pendingFiles.length === 0) || isUploading 
                      ? 'bg-jarvis-bg-2 text-jarvis-text-3 cursor-not-allowed opacity-50' 
                      : 'bg-jarvis-primary text-jarvis-bg hover:shadow-[0_0_20px_rgba(0,212,255,0.4)] active:scale-95'
                  }`}
                  aria-label="Send signal"
                >
                  <Send size={20} />
                </button>
              )}
            </div>
          </div>
          <div className="flex justify-between items-center mt-3 px-2 max-w-5xl mx-auto">
             <div className="flex items-center gap-3">
                <p className="text-[9px] text-jarvis-text-3 font-mono uppercase tracking-[0.2em] font-bold">
                  Core: <span className="text-jarvis-primary">{model}</span>
                </p>
                <div className="w-1 h-1 rounded-full bg-white/10" />
                <p className="text-[9px] text-jarvis-text-3 font-mono uppercase tracking-[0.2em] font-bold">
                  Status: <span className={streaming ? "text-jarvis-accent" : "text-jarvis-secondary"}>{streaming ? 'Processing' : 'Standby'}</span>
                </p>
             </div>
             <p className="text-[9px] text-jarvis-text-3 font-mono uppercase tracking-[0.2em]">
              Uplink secured via RSA-4096
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
