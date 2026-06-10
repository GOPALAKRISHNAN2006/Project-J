import { ButtonHTMLAttributes, ReactNode } from 'react'
import { motion } from 'framer-motion'

interface JarvisButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'solid' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
}

export default function JarvisButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}: JarvisButtonProps) {
  const variantClass = {
    primary: 'btn-jarvis',
    solid: 'btn-jarvis-solid',
    ghost: 'btn-jarvis opacity-70 hover:opacity-100 border-transparent hover:border-jarvis-border',
    danger: 'btn-jarvis-danger',
  }[variant]

  const sizeClass = {
    sm: 'px-3 py-1.5 text-[0.7rem]',
    md: 'px-5 py-2.5 text-[0.75rem]',
    lg: 'px-8 py-3.5 text-[0.85rem]',
  }[size]

  return (
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      className={`${variantClass} ${sizeClass} ${className} ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''} inline-flex items-center gap-2`}
      disabled={disabled || loading}
      {...(props as React.ComponentProps<typeof motion.button>)}
    >
      {loading ? (
        <span className="spinner-jarvis" style={{ width: 14, height: 14 }} />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
    </motion.button>
  )
}
