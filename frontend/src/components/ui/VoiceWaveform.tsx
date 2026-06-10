import { useEffect, useRef } from 'react'

interface WaveformProps {
  stream: MediaStream | null
  isListening: boolean
  isSpeaking: boolean
  color?: string
}

export default function VoiceWaveform({ stream, isListening, isSpeaking, color = '#00d4ff' }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const analyzerRef = useRef<AnalyserNode>()

  useEffect(() => {
    if (!stream || !canvasRef.current) return

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const source = audioContext.createMediaStreamSource(stream)
    const analyzer = audioContext.createAnalyser()
    analyzer.fftSize = 256
    source.connect(analyzer)
    analyzerRef.current = analyzer

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyzer.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw)
      analyzer.getByteFrequencyData(dataArray)

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      const barWidth = (canvas.width / bufferLength) * 2.5
      let barHeight
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height * (isListening ? 0.8 : 0.2)

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0)
        gradient.addColorStop(0, `${color}20`)
        gradient.addColorStop(1, color)

        ctx.fillStyle = gradient
        
        // Draw centered bars
        const y = (canvas.height - barHeight) / 2
        ctx.fillRect(x, y, barWidth - 1, barHeight)

        x += barWidth
      }
    }

    draw()

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      audioContext.close()
    }
  }, [stream, isListening, color])

  // Mock speaking waveform if needed, but usually we'd connect to the output audio
  
  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={100} 
      className="w-full h-24 opacity-80"
    />
  )
}
