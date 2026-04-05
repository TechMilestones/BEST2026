import React from 'react'
import { type FlightData } from '../../context/VisualizationContext'

// --- Styles ---
const playButtonStyle = (color: string): React.CSSProperties => ({
  background: color, border: 'none', borderRadius: '6px', color: '#000',
  width: '30px', height: '30px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'sans-serif',
  fontSize: '14px', alignSelf: 'center', transition: 'all 0.2s',
})

const pinButtonStyle = (color: string): React.CSSProperties => ({
  background: color, border: 'none', borderRadius: '6px', color: '#000',
  width: '180px', height: '30px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'sans-serif',
  fontSize: '14px', alignSelf: 'center', transition: 'all 0.2s',
})

const uiContainerStyle: React.CSSProperties = {
  position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
  width: '100%', maxWidth: '600px', background: '#171A1E',
  padding: '20px', borderRadius: '12px', color: 'white',
  fontFamily: 'Segoe UI, Roboto, sans-serif', boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
  backdropFilter: 'blur(5px)', border: '1px solid rgba(255,255,255,0.1)', zIndex: 100,
}

const uiRowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
}
const uiRowGridStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'auto auto auto', gap: '10px'
}
const uiColStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', justifyContent: 'start', alignItems: 'center',
}

const sliderStyle = {
  width: '100%', cursor: 'pointer', accentColor: '#00bcd4', height: '8px'
} as React.CSSProperties

// --- Component ---
interface DronePlayerUIProps {
  flightData: FlightData[]
  currentIndex: number
  setCurrentIndex: (idx: number) => void
  isPlaying: boolean
  setIsPlaying: (playing: boolean) => void
  isCameraLocked: boolean
  setIsCameraLocked: (locked: boolean) => void
  playbackSpeed: number
  setPlaybackSpeed: (speed: number) => void
  animationTimeRef: React.MutableRefObject<number>
}

export const DronePlayerUI: React.FC<DronePlayerUIProps> = ({
  flightData,
  currentIndex,
  setCurrentIndex,
  isPlaying,
  setIsPlaying,
  isCameraLocked,
  setIsCameraLocked,
  playbackSpeed,
  setPlaybackSpeed,
  animationTimeRef,
}) => {
  return (
    <div style={uiContainerStyle}>
      <div style={uiRowStyle}>
        <input
          type="range" min="0" max={flightData.length - 1} step={0.01}
          value={currentIndex}
          onChange={(e) => {
            const idx = parseInt(e.target.value)
            setCurrentIndex(idx)
            setIsPlaying(false)
            if (flightData.length > 1) {
              const t1 = flightData[idx].TimeUS
              const t2 = flightData[Math.min(idx + 1, flightData.length - 1)].TimeUS
              animationTimeRef.current = t1 + (t2 - t1) * 0.5
            }
          }}
          style={{ ...sliderStyle, marginBottom: '12px' }}
        />
      </div>

      <div style={uiRowGridStyle}>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={playButtonStyle(isPlaying ? '#ff4444' : '#44ff44')}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <button
          onClick={() => setIsCameraLocked(!isCameraLocked)}
          style={pinButtonStyle(isCameraLocked ? '#00bcd4' : '#666')}
        >
          {isCameraLocked ? '🔓 Відвязати камеру' : '🔒 Привязати камеру'}
        </button>

        <div style={uiColStyle}>
          <label style={{ fontSize: '12px', flex: 1 }}>
            Швидкість: <b>{playbackSpeed.toFixed(1)}x</b>
          </label>
          <input
            type="range" min="0.1" max="5" step="0.1"
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
            style={sliderStyle}
          />
        </div>
      </div>
    </div>
  )
}
