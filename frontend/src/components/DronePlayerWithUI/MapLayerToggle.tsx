import React from 'react'

interface MapLayerToggleProps {
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}

const labelStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '12px',
  color: '#E5E7EB',
  userSelect: 'none',
}

const checkboxStyle: React.CSSProperties = {
  width: '16px',
  height: '16px',
  accentColor: '#3B82F6',
  cursor: 'pointer',
}

const hintStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#9CA3AF',
}

export const MapLayerToggle: React.FC<MapLayerToggleProps> = ({ checked, disabled, onChange }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
      <label style={{ ...labelStyle, opacity: disabled ? 0.65 : 1 }}>
        <input
          type='checkbox'
          checked={checked}
          disabled={disabled}
          style={checkboxStyle}
          onChange={(e) => onChange(e.target.checked)}
        />
        Супутникова карта
      </label>
      {disabled && <span style={hintStyle}>GPS lat/lon відсутні в цьому логу</span>}
    </div>
  )
}
