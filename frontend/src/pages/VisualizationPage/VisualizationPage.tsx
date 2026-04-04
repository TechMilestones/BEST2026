import { useCallback } from 'react'
import './VisualizationPage.css'
import { useNavigate } from 'react-router-dom';
import TelemetryChart from '../../components/Chart/Chart';
import { useVisualizationContext, type TelemetryData } from '../../context/VisualizationContext';
import DronePlayerWithUI from '../../components/DronePlayerWithUI/DronePlayerWithUI';

// Форматує секунди у рядок MM:SS
function formatTime(sec: number): string {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  const ms = Math.floor((sec % 1) * 1000).toString().padStart(3, '0');

  return `${m}:${s}.${ms}`;
}

export default function VisualizationPage() {
  const { telemetry, setTelemetry, flightData, metrics } = useVisualizationContext()
  const navigate = useNavigate()

  const startTime = Number(flightData[0]?.TimeUS);

  const timeData = flightData.map(item =>
    (Number(item.TimeUS) - startTime) / 1_000_000
  );

  const speedData = flightData.map(item => Number(item.v_mag))
  const heightData = flightData.map(item => Number(item.z_m))

  // useCallback щоб не перестворювати функцію щорендеру
  const handleTelemetry = useCallback((t: TelemetryData) => {
    setTelemetry(t)
  }, [])

  console.log("Telemetry:", telemetry)

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
          <div className="visual-page_item item-col">
            <div className='visual-page_item_title'>ГРАФІКИ</div>
            <TelemetryChart
              title="Залежність швидкості від часу"
              x_array={timeData}
              y_array={speedData}
              current_x={(telemetry?.elapsedSec ?? 0) * 50}
              current_y={telemetry?.speedMs ?? 0}
            />
            <TelemetryChart
              title="Залежність висоти від часу"
              x_array={timeData}
              y_array={heightData}
              current_x={(telemetry?.elapsedSec ?? 0) * 50}
              current_y={telemetry?.altitudeM ?? 0}
            />
          </div>
        </div>

      </div>

      <div className='visual-page_row'>
        <div className="visual-page_item">
          <div className='visual-page_item_title'>ДАНІ ПРО ПОЛІТ</div>
          <div className="visual-page_item_inner all-col">
            <div className="visual-page_item_value">
              <p>Загальна дистанція:</p>
              <span>{metrics?.total_distance.toFixed(2) ?? '—'}</span>м
            </div>
            <div className="visual-page_item_value">
              <p>Макс. гор. швидкість:</p>
              <span>{metrics?.max_horizontal_speed.toFixed(2) ?? '—'}</span>м/c
            </div>
            <div className="visual-page_item_value">
              <p>Макс. верт. швидкість:</p>
              <span>{metrics?.max_vertical_speed.toFixed(2) ?? '—'}</span>м/c
            </div>
            <div className="visual-page_item_value">
              <p>Макс. прискорення:</p>
              <span>{metrics?.max_acceleration.toFixed(2) ?? '—'}</span>м/c^2
            </div>
            <div className="visual-page_item_value">
              <p>Макс. набір висоти:</p>
              <span>{metrics?.max_climb.toFixed(2) ?? '—'}</span>м
            </div>
            <div className="visual-page_item_value">
              <p>Тривалість польоту:</p>
              <span>{metrics?.duration_s.toFixed(2) ?? '—'}</span>
            </div>
          </div>
        </div>
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
  )
}
