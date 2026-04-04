import { useEffect, useState } from 'react'
import FloatingBall from '../../components/FloatingBall/FloatingBall'
import './VisualizationPage.css'
import { useNavigate } from 'react-router-dom';
import DronePlayerWithUI from '../DronePlayerWithUI/DronePlayerWithUI';

export default function VisualizationPage() {
  const [isOpened, setOpened] = useState(false); 
  const navigate = useNavigate();
  const [flightData, setFlightData] = useState([])

  useEffect(() => {
    fetch('/data.json')
      .then(res => res.json())
      .then(data => {
        // Перетворюємо v_mag у число, а також перевіряємо x_m, y_m, z_m, q_* тощо
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
          TimeUS: Number(row.TimeUS)
        }))
        setFlightData(cleanData)
      })
      .catch(err => console.error('Failed to load flight data:', err))
  }, [])

  return (
    <div className='visual-page'>
      <h1 className="visual-page_title">FPV DASHBOARD</h1>
      <div className='visual-page_row row-3d'>
        <div className="visual-page_row-item">
          <div className='visual-page_row-item_title'>3D ВІЗУАЛІЗАЦІЯ</div>
          <DronePlayerWithUI 
            flightData={flightData}
            objUrl='/modelka/12217_rocket_v1_l1.obj'
            textureUrl='/modelka/rocket.jpg'
          />
        </div>
        
        <div className="visual-page_row-item">
          <div className='visual-page_row-item_title'>ДАНІ ПРО ПОЛІТ</div>
          <div className="visual-page_row-item_inner two-col">
            <div className="visual-page_row-item_value">
              <p>Загальна дистанція:</p>
              <span>1259.10</span>м
            </div>

            <div className="visual-page_row-item_value">
              <p>Макс. гор. швидкість:</p>
              <span>15.08</span>м/c
            </div>

            <div className="visual-page_row-item_value">
              <p>Макс. верт. швидкість:</p>
              <span>35.79</span>м/c
            </div>

            <div className="visual-page_row-item_value">
              <p>Макс. прискорення:</p>
              <span>82.91</span>м/c^2
            </div>

            <div className="visual-page_row-item_value">
              <p>Макс. набір висоти:</p>
              <span>561.46</span>м
            </div>

            <div className="visual-page_row-item_value">
              <p>Тривалість польоту:</p>
              <span>52.20</span>c
            </div>
          </div>
        </div>
      </div>

      <div className='visual-page_row'>
        <div className="visual-page_row-item">
          <div className='visual-page_row-item_title'>ТЕЛЕМЕТРІЯ</div>
          <div className="visual-page_row-item_inner three-col">
            <div className="visual-page_row-item_value">
              <p>ШВИДКІСТЬ:</p>
              <span>15.08</span>м/c
            </div>

            <div className="visual-page_row-item_value">
              <p>ВИСОТА:</p>
              <span>35.79</span>м/c
            </div>

            <div className="visual-page_row-item_value">
              <p>НАПРАВЛЕННЯ:</p>
              <span>82.91</span>м
            </div>

            <div className="visual-page_row-item_value">
              <p>ШИРОТА:</p>
              <span>82.91</span>м
            </div>

            <div className="visual-page_row-item_value">
              <p>ДОВГОТА:</p>
              <span>82.91</span>м
            </div>
          </div>
        </div>

        <div className="visual-page_row-item">
          <div className='visual-page_row-item_title'>ЧАС ПОЛЬОТУ</div>
          <div className="visual-page_row-item_inner one-col">
            <div className="visual-page_row-item_value">
              <span>00:34:57</span>
              <p>Залишилося: 00:18:12</p>
            </div>
          </div>
        </div>
      </div>

      <div className='visual-page_ball'>
        <FloatingBall onClick={() => {setOpened(!isOpened)}} />
      </div>

      {isOpened && (
        <div className="floating-menu">
          <button className='floating-menu_btn' onClick={() => navigate("/")}>Upload another BIN-file</button>
        </div>
      )}
    </div>
  )
}
