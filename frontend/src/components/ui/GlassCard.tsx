import { motion } from 'framer-motion'
import { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
  onClick?: () => void
  animate?: boolean
  delay?: number
}

export default function GlassCard({
  children,
  className = '',
  hover = false,
  glow = false,
  onClick,
  animate = true,
  delay = 0,
}: GlassCardProps) {
  const base = `relative overflow-hidden rounded-xl ${hover ? 'glass-card-hover cursor-pointer' : 'glass-card'} ${glow ? 'border-glow' : ''} ${className}`

  const content = (
    <div className={base} onClick={onClick}>
      {/* Corner decorations */}
      <span className="corner-tl" />
      <span className="corner-tr" />
      <span className="corner-bl" />
      <span className="corner-br" />
      {children}
    </div>
  )

  if (!animate) return content

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
    >
      {content}
    </motion.div>
  )
}
