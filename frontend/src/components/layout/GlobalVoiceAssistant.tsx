import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, X, Volume2, Loader2, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import VoiceIndicator from '../ui/VoiceIndicator'

type AssistantState = 'idle' | 'listening' | 'processing' | 'speaking'

export default function GlobalVoiceAssistant() {
  const { token } = useAuthStore()
  const [state, setState] = useState<AssistantState>('idle')
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [visible, setVisible] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  
  const recognitionRef = useRef<any>(null)
  const audioQueueRef = useRef<{ data: string, type: string }[]>([])
  const isPlayingRef = useRef(false)
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  // Audio Queue Manager
  const playNextInQueue = useCallback(() => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false
      if (state === 'speaking') {
        setState('idle')
        setTimeout(() => {
          if (!isPlayingRef.current && (state as string) === 'idle') setVisible(false)
        }, 5000)
      }
      return
    }

    isPlayingRef.current = true
    const { data, type } = audioQueueRef.current.shift()!
    const blob = new Blob([Uint8Array.from(atob(data), c => c.charCodeAt(0))], { type })
    const url = URL.createObjectURL(blob)

    if (audioPlayerRef.current) {
      audioPlayerRef.current.src = url
      audioPlayerRef.current.play().catch(console.error)
      audioPlayerRef.current.onended = () => {
        URL.revokeObjectURL(url)
        playNextInQueue()
      }
    }
  }, [state])

  // WebSocket Connection
  useEffect(() => {
    if (!token) return

    const connectWS = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = import.meta.env.VITE_API_URL?.replace(/^https?:\/\//, '') || 'localhost:8000'
      const wsUrl = `${protocol}//${host}/api/voice/ws`
      
      const socket = new WebSocket(wsUrl)
      socket.onopen = () => socket.send(JSON.stringify({ token }))
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.type === 'transcript') setTranscript(data.text)
        if (data.type === 'response_chunk') {
          setResponse(prev => prev + data.text)
          setState('processing')
        }
        if (data.type === 'audio') {
          audioQueueRef.current.push({ data: data.data, type: data.media_type })
          if (!isPlayingRef.current) {
            setState('speaking')
            playNextInQueue()
          }
        }
        if (data.type === 'response_final') {
          setSessionId(data.session_id)
        }
        if (data.type === 'error') deactivate()
      }
      wsRef.current = socket
    }

    connectWS()
    return () => wsRef.current?.close()
  }, [token, playNextInQueue])

  // Wake Word Recognition
  useEffect(() => {
    if (!token) return
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const text = event.results[i][0].transcript.toLowerCase()
        if (text.includes('jarvis')) {
          console.log('Wake Word Triggered')
          handleInteractionTrigger()
          break
        }
      }
    }

    recognition.onend = () => {
      if (token) try { recognition.start() } catch (e) {}
    }

    recognitionRef.current = recognition
    recognition.start()

    return () => {
      recognition.stop()
      recognitionRef.current = null
    }
  }, [token])

  const handleInteractionTrigger = () => {
    if (state === 'speaking' || state === 'processing') {
      // Interrupt
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause()
        audioPlayerRef.current.currentTime = 0
      }
      audioQueueRef.current = []
      isPlayingRef.current = false
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'interrupt' }))
      }
    }
    activateAssistant()
  }

  const activateAssistant = async () => {
    setState('listening')
    setVisible(true)
    setTranscript('')
    setResponse('')
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'start_stream', session_id: sessionId }))
      }

      recorder.ondataavailable = async (e) => {
        if (e.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(await e.data.arrayBuffer())
        }
      }

      recorder.onstop = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ 
            type: 'end_stream', 
            language: 'auto',
            session_id: sessionId
          }))
          setState('processing')
        }
        stream.getTracks().forEach(t => t.stop())
      }

      recorder.start(250)
      
      // Auto-stop after 4 seconds for natural turn-taking
      setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop()
      }, 4000)

    } catch (err) {
      console.error(err)
      deactivate()
    }
  }

  const deactivate = () => {
    setState('idle')
    audioQueueRef.current = []
    isPlayingRef.current = false
    setTimeout(() => {
      if (state === 'idle') setVisible(false)
    }, 5000)
  }

  if (!token) return null

  return (
    <>
      <audio ref={audioPlayerRef} hidden />
      
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-4"
          >
            <div className="glass-card p-6 border-glow flex items-center gap-6 shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-jarvis-primary animate-pulse" />
              
              <div className="relative">
                <VoiceIndicator isListening={state === 'listening'} />
                {(state === 'processing' || state === 'speaking') && (
                  <motion.div 
                    className="absolute -inset-2 border-2 border-jarvis-primary rounded-full border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Sparkles size={12} className="text-jarvis-primary" />
                    <span className="text-[10px] font-orbitron font-bold text-jarvis-primary uppercase tracking-widest">
                      {state === 'listening' ? 'Awaiting Input' : state === 'processing' ? 'Processing Signal' : 'Synthesizing Response'}
                    </span>
                  </div>
                  <button onClick={() => setVisible(false)} className="text-jarvis-text-3 hover:text-white transition-colors">
                    <X size={14} />
                  </button>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-jarvis-text-3 font-mono truncate opacity-60">
                    {transcript || '...'}
                  </p>
                  <p className="text-sm text-white font-medium leading-relaxed max-h-20 overflow-y-auto custom-scrollbar">
                    {response || (state === 'listening' ? 'How can I assist you, Operator?' : 'Initializing...')}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-6 right-6 z-[90] flex items-center gap-3">
        <AnimatePresence>
          {!visible && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onClick={handleInteractionTrigger}
              className="flex items-center gap-3 px-4 py-2 rounded-full bg-jarvis-bg/80 border border-jarvis-primary/20 backdrop-blur-md shadow-lg cursor-pointer hover:border-jarvis-primary/50 transition-all group"
            >
              <motion.div 
                className="w-2 h-2 rounded-full bg-emerald-500" 
                animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-[10px] font-mono text-jarvis-text-3 uppercase tracking-widest group-hover:text-jarvis-primary transition-colors">
                System Active
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

