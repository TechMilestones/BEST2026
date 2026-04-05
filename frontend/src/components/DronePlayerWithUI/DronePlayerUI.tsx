import React from 'react'
import { type FlightData } from '../../context/VisualizationContext'
import { MapLayerToggle } from './MapLayerToggle'
// --- Colors ---
const COLORS = {
  panel: '#171A1E',
  panelBorder: 'rgba(255,255,255,0.06)',

  text: '#E5E7EB',
  mutedText: '#9CA3AF',

  button: '#1F2933',
  buttonHover: '#27303A',
  buttonActive: '#2F3A45',

  accent: '#3B82F6',
  accentSoft: 'rgba(59, 130, 246, 0.18)',

  dangerSoft: 'rgba(239, 68, 68, 0.16)',

  slider: '#3B82F6',
}

// --- Styles ---
const baseButtonStyle: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '10px',
  color: COLORS.text,
  cursor: 'pointer',
  fontWeight: 600,
  fontFamily: 'Inter, sans-serif',
  fontSize: '14px',
  transition: 'all 0.2s ease',
  background: COLORS.button,
}

const playButtonStyle = (isPlaying: boolean): React.CSSProperties => ({
  ...baseButtonStyle,
  width: '42px',
  height: '42px',
  fontSize: '16px',
  background: isPlaying ? COLORS.dangerSoft : COLORS.accentSoft,
  border: `1px solid ${isPlaying ? 'rgba(239,68,68,0.25)' : 'rgba(96,165,250,0.25)'}`,
  color: COLORS.text,
})

const pinButtonStyle = (isCameraLocked: boolean): React.CSSProperties => ({
  ...baseButtonStyle,
  minWidth: '190px',
  height: '42px',
  padding: '0 16px',
  background: isCameraLocked ? COLORS.accentSoft : COLORS.button,
  border: `1px solid ${isCameraLocked ? 'rgba(96,165,250,0.25)' : 'rgba(255,255,255,0.08)'}`,
  color: COLORS.text,
})

const uiContainerStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '24px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: 'calc(100% - 32px)',
  maxWidth: '680px',
  background: COLORS.panel,
  padding: '16px',
  borderRadius: '10px',
  color: COLORS.text,
  fontFamily: 'Inter, sans-serif',
  boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
  backdropFilter: 'blur(6px)',
  border: `1px solid ${COLORS.panelBorder}`,
  zIndex: 100,
  boxSizing: 'border-box',
}

const uiTopRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  marginBottom: '12px',
}

const uiBottomRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '42px minmax(190px, auto) 1fr',
  gap: '12px',
  alignItems: 'center',
}

const uiColStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: '6px',
  minWidth: 0,
}

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: COLORS.mutedText,
  lineHeight: 1.2,
}

const sliderStyle: React.CSSProperties = {
  width: '100%',
  cursor: 'pointer',
  accentColor: COLORS.slider,
  height: '8px',
}

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
  isSatelliteMapEnabled: boolean
  setIsSatelliteMapEnabled: (enabled: boolean) => void
  canUseSatelliteMap: boolean
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
  isSatelliteMapEnabled,
  setIsSatelliteMapEnabled,
  canUseSatelliteMap,
  animationTimeRef,
}) => {
  return (
    <div style={uiContainerStyle}>
      <div style={uiTopRowStyle}>
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

        <MapLayerToggle
          checked={isSatelliteMapEnabled}
          disabled={!canUseSatelliteMap}
          onChange={setIsSatelliteMapEnabled}
        />
      </div>

      <div style={uiBottomRowStyle}>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          style={playButtonStyle(isPlaying)}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <button
          onClick={() => setIsCameraLocked(!isCameraLocked)}
          style={pinButtonStyle(isCameraLocked)}
        >
          {isCameraLocked ? '🔓 Відвязати камеру' : '🔒 Привязати камеру'}
        </button>

        <div style={uiColStyle}>
          <label style={labelStyle}>
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
