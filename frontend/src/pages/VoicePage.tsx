import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Volume2, VolumeX, Loader2, Activity, Radio, Power, Settings2, History, AlertCircle } from 'lucide-react'
import GlassCard from '@/components/ui/GlassCard'
import JarvisButton from '@/components/ui/JarvisButton'
import VoiceWaveform from '@/components/ui/VoiceWaveform'
import SpeakingAnimation from '@/components/ui/SpeakingAnimation'
import { useAuthStore } from '@/store/authStore'

type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'wakeword'

export default function VoicePage() {
  const { token, user } = useAuthStore()
  const [state, setState] = useState<VoiceState>('idle')
  const [isContinuous, setIsContinuous] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [muted, setMuted] = useState(false)
  const [history, setHistory] = useState<{ user: string; ai: string; time: string }[]>([])
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const recognitionRef = useRef<any>(null)

  const [confidence, setConfidence] = useState<number | null>(null)
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState('auto')
  const [speed, setSpeed] = useState(1.0)
  const [showSettings, setShowSettings] = useState(false)
  const [ttsProvider, setTtsProvider] = useState('openai-tts')
  const [selectedVoice, setSelectedVoice] = useState('alloy')

  // Initialize WebSocket
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = import.meta.env.VITE_API_URL?.replace(/^https?:\/\//, '') || 'localhost:8000'
    const wsUrl = `${protocol}//${host}/api/voice/ws`
    
    const connectWS = () => {
      const socket = new WebSocket(wsUrl)
      
      socket.onopen = () => {
        console.log('Voice WebSocket connected')
        socket.send(JSON.stringify({ token }))
      }

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        
        switch (data.type) {
          case 'partial_transcript':
            setTranscript(data.text)
            setConfidence(data.confidence)
            setDetectedLanguage(data.language)
            break
          case 'transcript':
            setTranscript(data.text)
            setConfidence(data.confidence)
            break
          case 'response_chunk':
            setResponse((prev) => prev + data.text)
            break
          case 'audio':
            handleAudioResponse(data.data, data.media_type)
            break
          case 'error':
            console.error('WS Error:', data.message)
            setState(isContinuous ? 'wakeword' : 'idle')
            break
        }
      }

      socket.onclose = () => {
        console.log('Voice WebSocket disconnected')
        setTimeout(connectWS, 3000)
      }

      wsRef.current = socket
    }

    connectWS()

    return () => wsRef.current?.close()
  }, [token])

  const handleAudioResponse = useCallback((base64Audio: string, mediaType: string) => {
    if (muted) return
    
    const binary = atob(base64Audio)
    const array = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i)
    
    const blob = new Blob([array], { type: mediaType })
    const url = URL.createObjectURL(blob)
    
    if (audioPlayerRef.current) {
      audioPlayerRef.current.src = url
      audioPlayerRef.current.play()
      setState('speaking')
      
      audioPlayerRef.current.onended = () => {
        setState(isContinuous ? 'wakeword' : 'idle')
        URL.revokeObjectURL(url)
      }
    }
  }, [muted, isContinuous])

  const cancelSpeaking = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause()
      audioPlayerRef.current.currentTime = 0
      setState(isContinuous ? 'wakeword' : 'idle')
    }
  }

  const orbColor = {
    idle: '#94a3b8',
    wakeword: '#38bdf8',
    listening: '#10b981',
    processing: '#fbbf24',
    speaking: '#a855f7'
  }[state]

  const orbLabel = {
    idle: 'Offline',
    wakeword: 'Awaiting',
    listening: 'Listening',
    processing: 'Thinking',
    speaking: 'Speaking'
  }[state]

  // Persistent stream for visualization during Wake Word mode
  useEffect(() => {
    let activeStream: MediaStream | null = null
    
    const startVisualization = async () => {
      if (isContinuous && (state === 'wakeword' || state === 'idle')) {
        try {
          activeStream = await navigator.mediaDevices.getUserMedia({ audio: true })
          setStream(activeStream)
        } catch (err) {
          console.error('Failed to get visualization stream', err)
        }
      }
    }

    if (isContinuous && state === 'wakeword') {
      startVisualization()
    } else if (!isContinuous && state !== 'listening') {
      stream?.getTracks().forEach(t => t.stop())
      setStream(null)
    }

    return () => {
      if (state !== 'listening') {
        activeStream?.getTracks().forEach(t => t.stop())
      }
    }
  }, [isContinuous, state])

  // Initialize Speech Recognition - Removed as it is now handled globally by GlobalVoiceAssistant
  useEffect(() => {
    // Redundant logic removed
  }, [])

  const stopSpeaking = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause()
      setState(isContinuous ? 'wakeword' : 'idle')
    }
  }

  const startListening = async () => {
    stopSpeaking() // Interrupt current speech
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setStream(audioStream)
      
      const mediaRecorder = new MediaRecorder(audioStream)
      mediaRecorderRef.current = mediaRecorder
      
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(await event.data.arrayBuffer())
        }
      }

      mediaRecorder.onstop = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ 
            type: 'end_stream',
            language: selectedLanguage,
            tts_options: {
              speed: speed,
              voice: selectedVoice,
              provider: ttsProvider
            }
          }))
          setState('processing')
        } else {
          setState(isContinuous ? 'wakeword' : 'idle')
        }
        audioStream.getTracks().forEach(track => track.stop())
        setStream(null)
      }

      // Start recording with 250ms timeslice for streaming
      mediaRecorder.start(250)
      setState('listening')
      setTranscript('')
      setResponse('')
      setConfidence(null)
    } catch (err) {
      console.error('Failed to start recording', err)
    }
  }

  const stopListening = () => {
    if (mediaRecorderRef.current && state === 'listening') {
      mediaRecorderRef.current.stop()
    }
  }

  // ... (rest of helper functions)

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center mb-2 px-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isContinuous ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
            <span className="text-[10px] font-mono text-jarvis-text-3 uppercase tracking-tighter">
              {isContinuous ? 'Continuous Mode' : 'Manual Mode'}
            </span>
          </div>
          {confidence !== null && (
            <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-white/5 border border-white/10">
              <span className="text-[9px] font-mono text-slate-500 uppercase">Confidence</span>
              <span className={`text-[9px] font-bold font-mono ${confidence > 0.8 ? 'text-emerald-400' : confidence > 0.5 ? 'text-amber-400' : 'text-red-400'}`}>
                {(confidence * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-full border transition-all ${showSettings ? 'bg-jarvis-primary/10 border-jarvis-primary text-jarvis-primary' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
          >
            <Settings2 size={16} />
          </button>
          <button 
            onClick={() => setIsContinuous(!isContinuous)}
            className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all text-[10px] font-mono uppercase ${
              isContinuous ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <Radio size={12} />
            Wake Word
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <GlassCard className="p-6 mb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">TTS Provider</label>
                <select 
                  value={ttsProvider}
                  onChange={(e) => setTtsProvider(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-xs rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-jarvis-primary"
                >
                  <option value="openai-tts">OpenAI (Speed optimized)</option>
                  <option value="elevenlabs">ElevenLabs (Highest Quality)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Natural Voice</label>
                <select 
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-xs rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-jarvis-primary"
                >
                  {ttsProvider === 'openai-tts' ? (
                    <>
                      <option value="alloy">Alloy (Balanced)</option>
                      <option value="echo">Echo (Mature Male)</option>
                      <option value="fable">Fable (British Male)</option>
                      <option value="onyx">Onyx (Deep Male)</option>
                      <option value="nova">Nova (Soft Female)</option>
                      <option value="shimmer">Shimmer (Clear Female)</option>
                    </>
                  ) : (
                    <>
                      <option value="pNInz6obpgDQGcFmaJgB">Adam (Classic)</option>
                      <option value="ErXwobaYiN019PkySvjV">Antoni (Witty)</option>
                      <option value="VR6AweUjD35clNVIno7G">Arnold (Heroic)</option>
                      <option value="Lcf713o6H0X99pE1p1G5">Bella (Warm)</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Playback Speed</label>
                  <span className="text-[10px] font-mono text-jarvis-primary">{speed}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="2.0" 
                  step="0.1" 
                  value={speed}
                  onChange={(e) => setSpeed(parseFloat(e.target.value))}
                  className="w-full accent-jarvis-primary h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <GlassCard glow className="p-8 flex flex-col items-center gap-8 relative overflow-hidden min-h-[400px]">
        {/* Futuristic Background */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(#00d4ff_1px,transparent_1px)] [background-size:30px_30px]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>

        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <div className="w-[300px] h-[300px] rounded-full border border-dashed border-jarvis-primary/20 animate-[spin_20s_linear_infinite]" />
            <div className="absolute w-[350px] h-[350px] rounded-full border border-dotted border-jarvis-secondary/10 animate-[spin_30s_linear_infinite_reverse]" />
          </div>

          <motion.div
            className="relative z-10 w-56 h-56 rounded-full border-2 flex flex-col items-center justify-center cursor-pointer overflow-hidden"
            style={{ 
              borderColor: `${orbColor}40`, 
              background: `radial-gradient(circle at center, ${orbColor}15, transparent)`,
              boxShadow: state !== 'idle' ? `0 0 60px ${orbColor}20` : 'none'
            }}
            onClick={() => {
              if (state === 'idle' || state === 'wakeword') startListening()
              else if (state === 'listening') stopListening()
              else if (state === 'speaking') cancelSpeaking()
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {(state === 'listening' || state === 'wakeword') && (
              <div className="absolute inset-0 flex items-center justify-center px-4">
                <VoiceWaveform stream={stream} isListening={true} isSpeaking={false} color={orbColor} />
              </div>
            )}

            {state === 'speaking' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <SpeakingAnimation active={true} color={orbColor} />
              </div>
            )}

            <div className="relative z-20 flex flex-col items-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={state}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  {state === 'idle' && <Power size={40} className="text-slate-500" />}
                  {state === 'wakeword' && <Mic size={40} className="text-sky-400 animate-pulse" />}
                  {state === 'listening' && <Activity size={40} className="text-emerald-400" />}
                  {state === 'processing' && <Loader2 size={40} className="text-amber-400 animate-spin" />}
                  {state === 'speaking' && <Volume2 size={40} className="text-purple-400" />}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        <div className="text-center relative z-10">
          <motion.h3
            key={state}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-orbitron font-bold text-2xl uppercase tracking-[0.25em]"
            style={{ color: orbColor, textShadow: `0 0 15px ${orbColor}50` }}
          >
            {orbLabel}
          </motion.h3>
          <div className="flex items-center justify-center gap-2 mt-4 font-mono text-[10px] uppercase tracking-[0.3em] text-slate-500">
            {state === 'idle' && <span>Hold [Space] or Click to Initiate</span>}
            {state === 'wakeword' && <span className="text-sky-400/70">Listening for "JARVIS"...</span>}
            {state === 'listening' && <span className="text-emerald-400/70">Audio Feed Synchronized</span>}
            {state === 'speaking' && <span className="text-purple-400/70">Output Stream Active</span>}
          </div>
        </div>

        <div className="flex items-center gap-6 relative z-10">
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-jarvis-primary to-jarvis-secondary rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
            <JarvisButton 
              variant="solid" 
              onClick={state === 'listening' ? stopListening : startListening}
              disabled={state === 'processing' || state === 'speaking'}
              className="w-56 h-14 relative"
            >
              <div className="flex items-center justify-center gap-3">
                {state === 'listening' ? <MicOff size={18} /> : <Mic size={18} />}
                <span>{state === 'listening' ? 'CEASE INPUT' : 'MANUAL LINK'}</span>
              </div>
            </JarvisButton>
          </div>

          <button
            onClick={() => setMuted(!muted)}
            className="p-4 rounded-xl border transition-all duration-300 bg-slate-900/50 hover:bg-slate-800"
            style={{ 
              borderColor: muted ? '#ef444440' : '#334155', 
              color: muted ? '#ef4444' : '#94a3b8' 
            }}
          >
            {muted ? <VolumeX size={24} /> : <Volume2 size={24} />}
          </button>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {transcript && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <GlassCard className="p-6 border-l-2 border-l-emerald-500/50 bg-emerald-500/[0.02]">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-[9px] font-mono text-emerald-500 uppercase tracking-widest">Neural Transcript</span>
                </div>
                <p className="text-jarvis-text text-sm leading-relaxed font-light italic">"{transcript}"</p>
              </GlassCard>
            </motion.div>
          )}

          {response && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <GlassCard className="p-6 border-l-2 border-l-purple-500/50 bg-purple-500/[0.02]">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-1 rounded-full bg-purple-500 animate-ping" />
                  <span className="text-[9px] font-mono text-purple-500 uppercase tracking-widest">Synthesized Response</span>
                </div>
                <p className="text-jarvis-text text-sm leading-relaxed">{response}</p>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {history.length > 0 && (
        <GlassCard className="p-6 border-slate-800/50">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <History size={16} className="text-jarvis-primary" />
              <h3 className="font-orbitron text-jarvis-text text-xs font-bold uppercase tracking-[0.2em]">Temporal Logs</h3>
            </div>
            <span className="text-[9px] font-mono text-slate-500 uppercase">{history.length} Cycles</span>
          </div>
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {history.map((item, i) => (
              <motion.div key={i} className="p-5 rounded-xl border border-white/[0.03] bg-white/[0.01] space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[8px] font-mono text-slate-600 bg-slate-900/50 px-2 py-1 rounded border border-slate-800/50">{item.time}</span>
                </div>
                <p className="text-xs text-slate-400 italic"><span className="text-emerald-500/50 font-bold mr-2">USER:</span>"{item.user}"</p>
                <p className="text-xs text-slate-200"><span className="text-purple-500/50 font-bold mr-2">JARVIS:</span>{item.ai}</p>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  )
}
