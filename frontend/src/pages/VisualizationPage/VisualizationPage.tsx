import { useEffect, useState, useCallback } from 'react'
import './VisualizationPage.css'
import { useNavigate } from 'react-router-dom';
import DronePlayerWithUI, { type TelemetryData } from '../DronePlayerWithUI/DronePlayerWithUI';

// Форматує секунди у рядок MM:SS
function formatTime(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  const ms = Math.floor((sec % 1) * 1000).toString().padStart(3, '0');

  return `${m}:${s}.${ms}`;
}

export default function VisualizationPage() {
  const navigate = useNavigate()
  const [flightData, setFlightData] = useState<any[]>([])
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null)

  useEffect(() => {
    fetch('/data.json')
      .then(res => res.json())
      .then(data => {
        const cleanData = data.map((row: any) => ({
          ...row,
          x_m: Number(row.x_m),
          y_m: Number(row.y_m),
          z_m: Number(row.z_m),
          q_x: Number(row.q_x),
          q_y: Number(row.q_y),
          q_z: Number(row.q_z),
          q_w: Number(row.q_w),
          v_mag: Number(row.v_mag),
          TimeUS: Number(row.TimeUS),
          lat: row.lat != null ? Number(row.lat) : undefined,
          lon: row.lon != null ? Number(row.lon) : undefined,
        }))
        setFlightData(cleanData)
      })
      .catch(err => console.error('Failed to load flight data:', err))
  }, [])

  // useCallback щоб не перестворювати функцію щорендеру
  const handleTelemetry = useCallback((t: TelemetryData) => {
    setTelemetry(t)
  }, [])

  return (
    <div className='visual-page'>
      <header className='visual-page_header'>
        <h1 className="visual-page_title">FPV DASHBOARD</h1>
        <button className='visual-page_back-btn' onClick={() => navigate("/")}>Back</button>
      </header>
      <div className='visual-page_row row-3d'>
        <div className="visual-page_item">
          <div className='visual-page_item_title'>3D ВІЗУАЛІЗАЦІЯ</div>
          <DronePlayerWithUI
            flightData={flightData}
            objUrl='/modelka/12217_rocket_v1_l1.obj'
            textureUrl='/modelka/rocket.jpg'
            onTelemetry={handleTelemetry}
          />
        </div>

        <div className="visual-page_col">
          <div className="visual-page_item">
          <div className='visual-page_item_title'>ТЕЛЕМЕТРІЯ</div>
          <div className="visual-page_item_inner one-col">
            <div className="visual-page_item_value">
              <p>ШВИДКІСТЬ:</p>
              <span>{telemetry ? telemetry.speedMs.toFixed(2) : '—'}</span>м/c
            </div>
            <div className="visual-page_item_value">
              <p>ВИСОТА:</p>
              <span>{telemetry ? telemetry.altitudeM.toFixed(2) : '—'}</span>м
            </div>
            <div className="visual-page_item_value">
              <p>ШИРОТА:</p>
              <span>{telemetry?.lat != null ? telemetry.lat.toFixed(6) : '—'}</span>
            </div>
            <div className="visual-page_item_value">
              <p>ДОВГОТА:</p>
              <span>{telemetry?.lon != null ? telemetry.lon.toFixed(6) : '—'}</span>
            </div>
          </div>
        </div>

        <div className="visual-page_item">
          <div className='visual-page_item_title'>ЧАС ПОЛЬОТУ</div>
          <div className="visual-page_item_inner one-col">
            <div className="visual-page_item_value">
              <span>{telemetry ? formatTime(telemetry.elapsedSec) : '00:00:00'}</span>
              <p>Залишилося: {telemetry ? formatTime(telemetry.remainingSec) : '—'}</p>
            </div>
          </div>
        </div>
        </div>
        
      </div>

      <div className='visual-page_row'>
        <div className="visual-page_item">
          <div className='visual-page_item_title'>ДАНІ ПРО ПОЛІТ</div>
          <div className="visual-page_item_inner all-col">
            <div className="visual-page_item_value">
              <p>Загальна дистанція:</p>
              <span>1259.10</span>м
            </div>
            <div className="visual-page_item_value">
              <p>Макс. гор. швидкість:</p>
              <span>15.08</span>м/c
            </div>
            <div className="visual-page_item_value">
              <p>Макс. верт. швидкість:</p>
              <span>35.79</span>м/c
            </div>
            <div className="visual-page_item_value">
              <p>Макс. прискорення:</p>
              <span>82.91</span>м/c^2
            </div>
            <div className="visual-page_item_value">
              <p>Макс. набір висоти:</p>
              <span>561.46</span>м
            </div>
            <div className="visual-page_item_value">
              <p>Тривалість польоту:</p>
              <span>52.20</span>c
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}