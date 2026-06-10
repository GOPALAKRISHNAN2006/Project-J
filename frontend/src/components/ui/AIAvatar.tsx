import { motion } from 'framer-motion'

export default function AIAvatar() {
  return (
    <div className="relative w-48 h-48 flex items-center justify-center">
      {/* Outer rings */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute inset-0 border border-jarvis-primary/20 rounded-full"
          animate={{
            rotate: i % 2 === 0 ? 360 : -360,
            scale: [1, 1.05, 1],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            rotate: { duration: 10 + i * 5, repeat: Infinity, ease: "linear" },
            scale: { duration: 3, repeat: Infinity, ease: "easeInOut" },
            opacity: { duration: 3, repeat: Infinity, ease: "easeInOut" },
          }}
          style={{ padding: i * 12 }}
        />
      ))}

      {/* Hexagon core */}
      <motion.div
        className="relative w-24 h-24 bg-jarvis-primary/10 backdrop-blur-md flex items-center justify-center"
        style={{
          clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
          border: '1px solid rgba(0, 212, 255, 0.4)',
        }}
        animate={{
          boxShadow: [
            '0 0 20px rgba(0, 212, 255, 0.2)',
            '0 0 40px rgba(0, 212, 255, 0.4)',
            '0 0 20px rgba(0, 212, 255, 0.2)',
          ],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <motion.div
          className="w-12 h-12 bg-jarvis-primary rounded-full blur-md opacity-50"
          animate={{
            scale: [1, 1.5, 1],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-jarvis-primary rounded-full animate-ping opacity-75" />
        </div>
      </motion.div>

      {/* Orbiting particles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-jarvis-primary rounded-full shadow-[0_0_8px_#00d4ff]"
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
            delay: i * (8 / 8),
          }}
          style={{
            originX: "100px",
            originY: "100px",
            left: "50%",
            top: "50%",
            marginLeft: "-100px",
            marginTop: "-100px",
            transform: `rotate(${i * 45}deg) translateX(80px)`,
          }}
        />
      ))}
    </div>
  )
}
