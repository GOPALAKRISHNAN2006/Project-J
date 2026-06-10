import { Sun, Cloud, CloudRain, Wind } from 'lucide-react'
import GlassCard from './GlassCard'

export default function WeatherWidget() {
  // Mock weather data
  const weather = {
    temp: 24,
    condition: 'Partly Cloudy',
    location: 'Malibu, CA',
    humidity: 45,
    wind: 12
  }

  return (
    <GlassCard className="p-4" delay={0.2}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-jarvis-text-3 text-[10px] uppercase font-mono">Environment</p>
          <h4 className="text-sm font-semibold text-jarvis-text">{weather.location}</h4>
        </div>
        <Cloud className="text-jarvis-primary" size={20} />
      </div>
      
      <div className="flex items-end gap-3 mb-4">
        <span className="text-3xl font-orbitron font-bold text-jarvis-primary">{weather.temp}°C</span>
        <span className="text-xs text-jarvis-text-2 mb-1">{weather.condition}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-jarvis-primary/10 pt-3">
        <div className="flex items-center gap-2">
          <Wind size={12} className="text-jarvis-text-3" />
          <span className="text-[10px] text-jarvis-text-2">{weather.wind} km/h</span>
        </div>
        <div className="flex items-center gap-2">
          <CloudRain size={12} className="text-jarvis-text-3" />
          <span className="text-[10px] text-jarvis-text-2">{weather.humidity}% hum</span>
        </div>
      </div>
    </GlassCard>
  )
}
