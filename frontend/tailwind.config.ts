import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        jarvis: {
          bg: '#080c18',
          'bg-2': '#0d1526',
          'bg-3': '#111d33',
          primary: '#00d4ff',
          'primary-dim': '#0099cc',
          secondary: '#00ff88',
          accent: '#ffaa00',
          danger: '#ff4455',
          muted: '#1e2d4a',
          border: 'rgba(0, 212, 255, 0.15)',
          'border-bright': 'rgba(0, 212, 255, 0.5)',
          text: '#e2e8f0',
          'text-2': '#94a3b8',
          'text-3': '#64748b',
        },
      },
      fontFamily: {
        orbitron: ['Orbitron', 'monospace'],
        inter: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'jarvis-gradient': 'linear-gradient(135deg, #080c18 0%, #0d1526 50%, #080c18 100%)',
        'cyan-glow': 'radial-gradient(circle, rgba(0, 212, 255, 0.15) 0%, transparent 70%)',
        'card-gradient': 'linear-gradient(135deg, rgba(13, 21, 38, 0.8) 0%, rgba(17, 29, 51, 0.6) 100%)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'scan': 'scan 4s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 10s linear infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-left': 'slideInLeft 0.35s ease-out',
        'blink': 'blink 1s step-end infinite',
        'ripple': 'ripple 2s ease-out infinite',
        'data-flow': 'dataFlow 3s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { 
            boxShadow: '0 0 5px rgba(0,212,255,0.4), 0 0 10px rgba(0,212,255,0.2)' 
          },
          '50%': { 
            boxShadow: '0 0 20px rgba(0,212,255,0.8), 0 0 40px rgba(0,212,255,0.4), 0 0 60px rgba(0,212,255,0.2)' 
          },
        },
        scan: {
          '0%': { transform: 'translateY(-10%)' },
          '100%': { transform: 'translateY(110vh)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(16px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        slideInLeft: {
          from: { transform: 'translateX(-16px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        ripple: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        dataFlow: {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '100% 100%' },
        },
      },
      boxShadow: {
        'jarvis': '0 0 20px rgba(0, 212, 255, 0.3)',
        'jarvis-lg': '0 0 40px rgba(0, 212, 255, 0.4)',
        'jarvis-inner': 'inset 0 0 20px rgba(0, 212, 255, 0.1)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}

export default config
