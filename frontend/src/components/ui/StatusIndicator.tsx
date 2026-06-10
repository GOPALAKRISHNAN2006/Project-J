import { motion } from 'framer-motion'

interface StatusIndicatorProps {
  online?: boolean
  label?: string
  size?: 'sm' | 'md'
}

export default function StatusIndicator({
  online = true,
  label,
  size = 'md',
}: StatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <motion.div
          className={`rounded-full ${size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'}`}
          style={{ background: online ? '#00ff88' : '#ff4455' }}
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        {online && (
          <motion.div
            className={`absolute inset-0 rounded-full ${size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'}`}
            style={{ background: 'rgba(0, 255, 136, 0.4)' }}
            animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
      </div>
      {label && (
        <span
          className={`font-medium ${size === 'sm' ? 'text-xs' : 'text-sm'}`}
          style={{ color: online ? '#00ff88' : '#ff4455' }}
        >
          {label}
        </span>
      )}
    </div>
  )
}
