import { useCallback, useEffect, useMemo, useState } from 'react'
import './VisualizationPage.css'
import { useNavigate } from 'react-router-dom';
import { useVisualizationContext, type TelemetryData } from '../../context/VisualizationContext';
import DronePlayerWithUI from '../../components/DronePlayerWithUI/DronePlayerWithUI';
import SubscribingChart from '../../components/Chart/SubscribingChart';
import { TelemetryValue } from '../../components/Visualization/TelemetryValue';
import { FlightTimeValue } from '../../components/Visualization/FlightTimeValue';
import { StaticMetric } from '../../components/Visualization/StaticMetric';
import { isDbEmpty } from '../../utils/indexedDbStorage';

const modelOptions = [
  {
    key: 'rocket',
    label: 'Ракета',
    objUrl: '/modelka/12217_rocket_v1_l1.obj',
    textureUrl: '/modelka/rocket.jpg',
    scale: 0.005,
  },
  {
    key: 'drone',
    label: 'Дрон',
    objUrl: '/modelka/fpv_cubed.obj',
    textureUrl: '/modelka/fpv_3.png',
    scale: 0.5,
  },
]

export default function VisualizationPage() {
  const { flightData, metrics, updateTelemetry } = useVisualizationContext()
  const [selectedModelKey, setSelectedModelKey] = useState(modelOptions[0].key)
  const navigate = useNavigate();
  
  useEffect(() => {
    const checkDb = async () => {
      try {
        const empty = await isDbEmpty();

        if (empty) {
          navigate("/");
        }
      } catch (error) {
        console.error("Failed to check IndexedDB:", error);
        navigate("/");
      }
    };

    checkDb();
  }, [navigate]);

  const selectedModel = useMemo(
    () => modelOptions.find((model) => model.key === selectedModelKey) ?? modelOptions[0],
    [selectedModelKey]
  )

  // Expensive data preparation memoized
  const { timeData, speedData, heightData } = useMemo(() => {
    if (!flightData.length) return { timeData: [], speedData: [], heightData: [] };

    const startTime = Number(flightData[0].TimeUS);
    return {
      timeData: flightData.map(item => (Number(item.TimeUS) - startTime) / 1_000_000),
      speedData: flightData.map(item => Number(item.v_mag)),
      heightData: flightData.map(item => Number(item.z_m))
    };
  }, [flightData]);

  const handleTelemetry = useCallback((t: TelemetryData) => {
    updateTelemetry(t);
  }, [updateTelemetry]);

  return (
    <div className='visual-page'>
      <header className='visual-page_header'>
        <h1 className="visual-page_title">FPV DASHBOARD</h1>
        <button className='visual-page_back-btn' onClick={() => navigate("/")}>Назад</button>
      </header>
      <div className='visual-page_row row-3d'>
        <div className="visual-page_item item-3d">
          <div className="visual-page_item_header">
            <div className='visual-page_item_title title-3d'>3D ВІЗУАЛІЗАЦІЯ</div>
            <select
              className="visual-page_model-select"
              value={selectedModelKey}
              onChange={(e) => setSelectedModelKey(e.target.value)}
            >
              {modelOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <DronePlayerWithUI
            flightData={flightData}
            objUrl={selectedModel.objUrl}
            textureUrl={selectedModel.textureUrl}
            scale={selectedModel.scale}
            onTelemetry={handleTelemetry}
          />
        </div>

        <div className="visual-page_col">
          <div className="visual-page_item item-col">
            <div className='visual-page_item_title'>ГРАФІКИ</div>
            <SubscribingChart
              title="Залежність швидкості від часу"
              x_array={timeData}
              y_array={speedData}
              getX={useCallback((t: TelemetryData) => t.elapsedSec * 50, [])}
              getY={useCallback((t: TelemetryData) => t.speedMs, [])}
              xAxis='Час, с'
              yAxis='Швидкість, м/с'
            />
            <SubscribingChart
              title="Залежність висоти від часу"
              x_array={timeData}
              y_array={heightData}
              getX={useCallback((t: TelemetryData) => t.elapsedSec * 50, [])}
              getY={useCallback((t: TelemetryData) => t.altitudeM, [])}
              xAxis='Час, с'
              yAxis='Висота, м'
            />
          </div>
        </div>

      </div>

      <div className='visual-page_row row-default'>
        <div className="visual-page_item">
          <div className='visual-page_item_title'>ДАНІ ПРО ПОЛІТ</div>
          <div className="visual-page_item_inner three-col">
            <StaticMetric label="Загальна дистанція" value={metrics?.total_distance} unit="м" />
            <StaticMetric label="Макс. гор. швидкість" value={metrics?.max_horizontal_speed} unit="м/c" />
            <StaticMetric label="Макс. верт. швидкість" value={metrics?.max_vertical_speed} unit="м/c" />
            <StaticMetric label="Макс. прискорення" value={metrics?.max_acceleration} unit="м/c^2" />
            <StaticMetric label="Макс. набір висоти" value={metrics?.max_climb} unit="м" />
            <StaticMetric label="Тривалість польоту" value={metrics?.duration_s} unit="c" />
          </div>
        </div>

        <div className="visual-page_item">
          <div className='visual-page_item_title'>ТЕЛЕМЕТРІЯ</div>
          <div className="visual-page_item_inner two-col">
            <TelemetryValue label="ШВИДКІСТЬ" unit="м/c" getValue={useCallback(t => t.speedMs, [])} />
            <TelemetryValue label="ВИСОТА" unit="м" getValue={useCallback(t => t.altitudeM, [])} />
            <TelemetryValue label="ШИРОТА" toFixed={6} getValue={useCallback(t => t.lat, [])} />
            <TelemetryValue label="ДОВГОТА" toFixed={6} getValue={useCallback(t => t.lon, [])} />
          </div>
        </div>

        <div className="visual-page_item">
          <div className='visual-page_item_title'>ЧАС ПОЛЬОТУ</div>
          <div className="visual-page_item_inner one-col">
            <FlightTimeValue />
          </div>
        </div>
      </div>

    </div>
  )
}
