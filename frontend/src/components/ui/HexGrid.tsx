import { useEffect, useRef } from 'react'

interface HexGridProps {
  className?: string
  opacity?: number
}

export default function HexGrid({ className = '', opacity = 0.04 }: HexGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animFrame: number
    let tick = 0

    function resize() {
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    function drawHex(x: number, y: number, size: number, alpha: number) {
      if (!ctx) return
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6
        const px = x + size * Math.cos(angle)
        const py = y + size * Math.sin(angle)
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.strokeStyle = `rgba(0, 212, 255, ${alpha})`
      ctx.lineWidth = 0.5
      ctx.stroke()
    }

    function draw() {
      if (!canvas || !ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const hexSize = 28
      const hexW = hexSize * Math.sqrt(3)
      const hexH = hexSize * 2
      const cols = Math.ceil(canvas.width / hexW) + 2
      const rows = Math.ceil(canvas.height / (hexH * 0.75)) + 2

      for (let row = -1; row < rows; row++) {
        for (let col = -1; col < cols; col++) {
          const x = col * hexW + (row % 2) * (hexW / 2)
          const y = row * hexH * 0.75
          const dist = Math.sqrt(
            Math.pow(x - canvas.width / 2, 2) + Math.pow(y - canvas.height / 2, 2)
          )
          const wave = Math.sin(dist * 0.01 - tick * 0.02) * 0.5 + 0.5
          const alpha = opacity * (0.3 + wave * 0.7)
          drawHex(x, y, hexSize - 2, alpha)
        }
      }

      tick++
      animFrame = requestAnimationFrame(draw)
    }

    resize()
    draw()

    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(animFrame)
      window.removeEventListener('resize', resize)
    }
  }, [opacity])

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none ${className}`}
      style={{ zIndex: 0 }}
    />
  )
}
