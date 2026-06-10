import { motion } from 'framer-motion'

interface SpeakingAnimationProps {
  active: boolean
  color?: string
}

export default function SpeakingAnimation({ active, color = '#a855f7' }: SpeakingAnimationProps) {
  return (
    <div className="flex items-center justify-center gap-1 h-12">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1.5 rounded-full"
          style={{ backgroundColor: color }}
          animate={active ? {
            height: [8, 32, 12, 40, 8],
            opacity: [0.4, 1, 0.4]
          } : {
            height: 4,
            opacity: 0.2
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.1,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  )
}
