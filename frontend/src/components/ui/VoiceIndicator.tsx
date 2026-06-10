import { motion } from 'framer-motion'
import { Mic } from 'lucide-react'

interface VoiceIndicatorProps {
  isListening?: boolean
}

export default function VoiceIndicator({ isListening = false }: VoiceIndicatorProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        {isListening && (
          <>
            <motion.div
              className="absolute inset-0 bg-jarvis-primary/20 rounded-full"
              animate={{ scale: [1, 2], opacity: [0.5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.div
              className="absolute inset-0 bg-jarvis-primary/20 rounded-full"
              animate={{ scale: [1, 1.6], opacity: [0.5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            />
          </>
        )}
        <div className={`
          w-12 h-12 rounded-full flex items-center justify-center z-10 relative
          ${isListening ? 'bg-jarvis-primary text-jarvis-bg' : 'bg-jarvis-primary/10 text-jarvis-primary border border-jarvis-primary/30'}
          transition-all duration-300
        `}>
          <Mic size={20} className={isListening ? 'animate-pulse' : ''} />
        </div>
      </div>
      
      {isListening && (
        <div className="flex items-center gap-1 h-4">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1 bg-jarvis-primary rounded-full"
              animate={{
                height: [4, 16, 4],
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                delay: i * 0.1,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
