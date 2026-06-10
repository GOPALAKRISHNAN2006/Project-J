import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Camera, Eye, Maximize, Scan, Search, 
  User, Box, Hand, FileText, CreditCard, Receipt,
  RefreshCw, Download, Trash2, CheckCircle2, AlertCircle,
  Monitor, Upload, Image as ImageIcon, MessageSquare
} from 'lucide-react'
import GlassCard from '@/components/ui/GlassCard'
import JarvisButton from '@/components/ui/JarvisButton'

export default function VisionPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [activeTask, setActiveTask] = useState<string | null>(null)
  const [detections, setDetections] = useState<any[]>([])
  const [analysisResult, setAnalysisResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsStreaming(true)
        setPreviewImage(null)
      }
    } catch (err) {
      console.error("Failed to start webcam", err)
    }
  }

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
      videoRef.current.srcObject = null
      setIsStreaming(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      stopWebcam()
      const reader = new FileReader()
      reader.onload = (event) => {
        setPreviewImage(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleMultimodalAnalysis = async (task: string) => {
    setActiveTask(task)
    setLoading(true)
    // Simulate multimodal AI response
    setTimeout(() => {
      const responses: Record<string, string> = {
        'screenshot': 'I see a dashboard with a sidebar and a main chat area. The UI elements include a "Send" button, a text input field, and several navigation icons. The application seems to be a complex AI management interface.',
        'chart': 'The chart shows a steady upward trend in user engagement over the last 6 months, with a notable spike in May. The X-axis represents months and the Y-axis represents thousands of active users.',
        'objects': 'I detected 4 objects in this image: 1 Laptop (98% confidence), 1 Coffee Mug (92% confidence), 1 Smartphone (89% confidence), and 1 Notebook (85% confidence).',
        'qa': 'Yes, there is a visible brand logo in the top-right corner of the interface.'
      }
      setAnalysisResult(responses[task] || `Detailed analysis for ${task} completed.`)
      setLoading(false)
    }, 2500)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-jarvis-primary/10 border border-jarvis-primary/20">
              <Eye className="text-jarvis-primary" size={24} />
            </div>
            <h1 className="font-orbitron text-2xl font-bold text-white tracking-wider uppercase">Visual Cortex</h1>
          </div>
          <p className="text-jarvis-text-3 text-sm font-mono uppercase tracking-widest opacity-60">Advanced Optical Processing Unit</p>
        </div>
        
        <div className="flex gap-4">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
          <JarvisButton variant="ghost" onClick={() => fileInputRef.current?.click()} icon={<Upload size={18} />}>
            Upload Image
          </JarvisButton>
          <JarvisButton 
            variant={isStreaming ? "solid" : "ghost"}
            onClick={isStreaming ? stopWebcam : startWebcam} 
            icon={<Camera size={18} />}
          >
            {isStreaming ? 'Disable Vision' : 'Initialize Optic Stream'}
          </JarvisButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Live Preview / Image Preview */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard glow className="relative aspect-video bg-black/40 border-jarvis-primary/20 overflow-hidden flex items-center justify-center">
            {isStreaming ? (
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            ) : previewImage ? (
              <img src={previewImage} className="w-full h-full object-contain" alt="Preview" />
            ) : (
              <div className="text-center space-y-4">
                 <Camera size={48} className="mx-auto text-jarvis-text-3 opacity-20" />
                 <p className="font-orbitron text-jarvis-text-3 text-xs uppercase tracking-widest">Awaiting Signal...</p>
              </div>
            )}
            
            <AnimatePresence>
               {detections.length > 0 && (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-4 left-4 p-3 bg-jarvis-primary/10 backdrop-blur-md border border-jarvis-primary/30 rounded-lg">
                       {detections.map((d, i) => (
                         <div key={i} className="flex items-center gap-2">
                            <CheckCircle2 size={12} className="text-jarvis-secondary" />
                            <span className="text-[10px] font-mono text-white uppercase">{d.label} ({(d.confidence * 100).toFixed(0)}%)</span>
                         </div>
                       ))}
                    </div>
                 </motion.div>
               )}
            </AnimatePresence>
          </GlassCard>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <JarvisButton variant="ghost" onClick={() => handleMultimodalAnalysis('screenshot')} className="flex-col gap-2 py-6 h-auto">
                <Monitor size={20} />
                <span className="text-[9px] uppercase tracking-tighter">Analyze Screen</span>
             </JarvisButton>
             <JarvisButton variant="ghost" onClick={() => handleMultimodalAnalysis('chart')} className="flex-col gap-2 py-6 h-auto">
                <ImageIcon size={20} />
                <span className="text-[9px] uppercase tracking-tighter">Read Charts</span>
             </JarvisButton>
             <JarvisButton variant="ghost" onClick={() => handleMultimodalAnalysis('objects')} className="flex-col gap-2 py-6 h-auto">
                <Box size={20} />
                <span className="text-[9px] uppercase tracking-tighter">Identify Objects</span>
             </JarvisButton>
             <JarvisButton variant="ghost" onClick={() => handleMultimodalAnalysis('qa')} className="flex-col gap-2 py-6 h-auto">
                <MessageSquare size={20} />
                <span className="text-[9px] uppercase tracking-tighter">Visual QA</span>
             </JarvisButton>
          </div>
        </div>

        {/* Side Panel: Multimodal Analysis Stream */}
        <div className="space-y-6">
           <GlassCard className="p-6 border-jarvis-border/20 h-full">
              <h3 className="font-orbitron text-sm font-bold text-white mb-6 uppercase tracking-widest border-b border-white/5 pb-2">Analysis Intelligence</h3>
              
              <div className="space-y-6">
                 {loading ? (
                   <div className="flex flex-col items-center justify-center py-12 space-y-4">
                      <RefreshCw size={24} className="text-jarvis-primary animate-spin" />
                      <p className="text-[10px] font-mono text-jarvis-text-3 uppercase">AI Reasoning in Progress...</p>
                   </div>
                 ) : analysisResult ? (
                   <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      <div className="p-4 bg-black/40 rounded-xl border border-white/5 shadow-inner">
                         <p className="text-xs text-jarvis-text-2 leading-relaxed font-mono">
                           {analysisResult}
                         </p>
                      </div>
                      <div className="flex gap-2">
                        <JarvisButton variant="ghost" size="sm" icon={<Download size={14} />} className="flex-1">Save Analysis</JarvisButton>
                        <JarvisButton variant="ghost" size="sm" onClick={() => setAnalysisResult(null)} icon={<Trash2 size={14} />}>Clear</JarvisButton>
                      </div>
                   </motion.div>
                 ) : (
                   <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl">
                      <p className="text-[10px] font-mono text-jarvis-text-3 uppercase opacity-40">Awaiting visual input</p>
                   </div>
                 )}

                 <div className="space-y-3 pt-6 border-t border-white/5">
                    <p className="text-[10px] font-mono text-jarvis-text-3 uppercase tracking-widest mb-4">Autonomous Reasoning</p>
                    <button className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:border-jarvis-primary/30 transition-all group">
                       <div className="flex items-center gap-3">
                          <ImageIcon size={16} className="text-jarvis-text-3 group-hover:text-jarvis-primary" />
                          <span className="text-xs text-white text-left">Explain Application Flow</span>
                       </div>
                    </button>
                    <button className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:border-jarvis-primary/30 transition-all group">
                       <div className="flex items-center gap-3">
                          <Scan size={16} className="text-jarvis-text-3 group-hover:text-jarvis-primary" />
                          <span className="text-xs text-white text-left">Extract Structural Data</span>
                       </div>
                    </button>
                 </div>
              </div>
           </GlassCard>
        </div>
      </div>
    </div>
  )
}
