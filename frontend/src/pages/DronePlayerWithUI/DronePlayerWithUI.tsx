import * as THREE from 'three'
import React, { useState, useMemo, useEffect, Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Line, Sphere, Html, useProgress, Grid } from '@react-three/drei'
import { OBJLoader } from 'three-stdlib'
import Papa from 'papaparse'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

// --- 1. Інтерфейси ---
interface FlightData {
  TimeUS: number
  x_m: number
  y_m: number
  z_m: number
  q_w: number
  q_x: number
  q_y: number
  q_z: number
  v_mag: number
}

interface DroneModelProps {
  textureUrl: string
  objUrl: string
  scale?: number | [number, number, number]
  position?: [number, number, number]
}

interface DroneVisualizerProps {
  data: FlightData[] | null
  setData: React.Dispatch<React.SetStateAction<FlightData[] | null>>
  currentIndex: number
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>
  isPlaying: boolean
  isCameraLocked: boolean
  playbackSpeed: number
  orbitRef: React.RefObject<OrbitControlsImpl>
  animationTimeRef: React.MutableRefObject<number>
  objUrl: string
  textureUrl: string
}

// --- 2. Компоненти ---

const DroneModel = React.forwardRef<THREE.Group, DroneModelProps>(({ textureUrl, objUrl, ...props }, ref) => {
  const colorMap = React.useMemo(() => new THREE.TextureLoader().load(textureUrl), [textureUrl])
  const [obj, setObj] = React.useState<THREE.Group | null>(null)

  useEffect(() => {
    new OBJLoader().load(objUrl, (loaded) => {
      loaded.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh
          mesh.material = new THREE.MeshStandardMaterial({
            map: colorMap,
            metalness: 0.6,
            roughness: 0.4,
          })
        }
      })
      setObj(loaded)
    })
  }, [objUrl, colorMap])

  if (!obj) return null
  return <primitive ref={ref} object={obj} {...props} />
})

function Loader() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div style={{ color: 'white', background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '4px' }}>
        {progress.toFixed(0)}% loaded
      </div>
    </Html>
  )
}

// --- 3. Допоміжні змінні для інтерполяції ---
const _posA = new THREE.Vector3()
const _posB = new THREE.Vector3()
const _quatA = new THREE.Quaternion()
const _quatB = new THREE.Quaternion()

function getInterpolatedState(data: FlightData[], floatIndex: number) {
  if (!data || data.length === 0) return null

  const i = Math.max(0, Math.min(floatIndex, data.length - 1))
  const idx1 = Math.floor(i)
  const idx2 = Math.min(idx1 + 1, data.length - 1)
  const weight = i - idx1

  const d1 = data[idx1]
  const d2 = data[idx2]

  _posA.set(d1.x_m, d1.z_m, -d1.y_m)
  _posB.set(d2.x_m, d2.z_m, -d2.y_m)
  _posA.lerp(_posB, weight)

  _quatA.set(-d1.q_y, d1.q_x,  d1.q_z, d1.q_w).normalize()
  _quatB.set(-d2.q_y, d2.q_x, d2.q_z, d2.q_w).normalize()

  if (_quatA.dot(_quatB) < 0) {
    _quatB.x *= -1
    _quatB.y *= -1
    _quatB.z *= -1
    _quatB.w *= -1
  }

  _quatA.slerp(_quatB, weight)

  return {
    position: _posA.clone(),
    quaternion: _quatA.clone(),
    v_mag: d1.v_mag + (d2.v_mag - d1.v_mag) * weight,
    TimeUS: d1.TimeUS + (d2.TimeUS - d1.TimeUS) * weight,
  }
}

function getStateAtTime(data: FlightData[], targetTimeUS: number) {
  if (!data || data.length === 0) return null
  if (targetTimeUS <= data[0].TimeUS) return getInterpolatedState(data, 0)
  if (targetTimeUS >= data[data.length - 1].TimeUS) return getInterpolatedState(data, data.length - 1)

  let lo = 0
  let hi = data.length - 1
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2)
    if (data[mid].TimeUS <= targetTimeUS) lo = mid
    else hi = mid
  }

  const d1 = data[lo]
  const d2 = data[hi]
  const timeDiff = d2.TimeUS - d1.TimeUS
  const frac = timeDiff === 0 ? 0 : (targetTimeUS - d1.TimeUS) / timeDiff

  return getInterpolatedState(data, lo + frac)
}

// --- 4. Основний візуалізатор ---

const DroneVisualizer: React.FC<DroneVisualizerProps> = ({
  data,
  setData,
  currentIndex,
  setCurrentIndex,
  isPlaying,
  isCameraLocked,
  playbackSpeed,
  orbitRef,
  animationTimeRef,
  objUrl,
  textureUrl,
}) => {
  const droneRef = useRef<THREE.Group>(null!)
  const gridRef = useRef<THREE.Object3D>(null!)

  useEffect(() => {
    if (!data) {
      Papa.parse<FlightData>('/moving_points.csv', {
        download: true,
        header: true,
        dynamicTyping: true,
        complete: (results) => {
          const clean = results.data.filter(
            (row) => row.TimeUS !== undefined && row.x_m !== undefined
          )
          setData(clean)
          if (clean.length > 0) animationTimeRef.current = clean[0].TimeUS
        },
      })
    }
  }, [data, setData, animationTimeRef])

  const { points, colors } = useMemo(() => {
    if (!data || data.length === 0) return { points: [], colors: [] }
    const pts = data.map((d) => new THREE.Vector3(d.x_m, d.z_m, -d.y_m))
    const maxSpeed = Math.max(...data.map((d) => d.v_mag || 1)) || 1
    const clrs = data.map((d) => {
      const c = new THREE.Color()
      c.setHSL(0.6 * (1 - Math.min(d.v_mag / maxSpeed, 1)), 1, 0.5)
      return c
    })
    return { points: pts, colors: clrs }
  }, [data])

  // Один useFrame для всієї логіки
  useFrame((state, delta) => {
    if (!data || data.length < 2) return

    const startTime = data[0].TimeUS
    const endTime = data[data.length - 1].TimeUS

    // Оновлення часу анімації
    if (isPlaying) {
      animationTimeRef.current += delta * 1_000_000 * playbackSpeed
      if (animationTimeRef.current > endTime) animationTimeRef.current = startTime
    } else {
      const idx = currentIndex
      const nextIdx = Math.min(idx + 1, data.length - 1)
      const t1 = data[idx]?.TimeUS || startTime
      const t2 = data[nextIdx]?.TimeUS || t1
      animationTimeRef.current = t1 + (t2 - t1) * 0.5
    }

    const stateInterp = getStateAtTime(data, animationTimeRef.current)

    if (droneRef.current && stateInterp) {
      const previousPosition = droneRef.current.position.clone()

      droneRef.current.position.copy(stateInterp.position)
      droneRef.current.quaternion.copy(stateInterp.quaternion)

      // Слідкування сітки за дроном
      if (gridRef.current) {
        const step = 10
        gridRef.current.position.x = Math.round(droneRef.current.position.x / step) * step
        gridRef.current.position.z = Math.round(droneRef.current.position.z / step) * step
        gridRef.current.position.y = -0.05
      }

      if (isCameraLocked && orbitRef.current) {
        const moveDelta = new THREE.Vector3().subVectors(droneRef.current.position, previousPosition)
        state.camera.position.add(moveDelta)
        orbitRef.current.target.copy(droneRef.current.position)
        orbitRef.current.update()
      }

      const newIndex = Math.floor(
        ((animationTimeRef.current - startTime) / (endTime - startTime)) * (data.length - 1)
      )
      if (newIndex !== currentIndex) setCurrentIndex(newIndex)
    }
  })

  if (!data || data.length === 0) return null

  return (
    <group>
      <DroneModel ref={droneRef} objUrl={objUrl} textureUrl={textureUrl} scale={0.005} />

      <Line points={points} vertexColors={colors as any} lineWidth={2} />

      <Sphere args={[0.2]} position={points[0]}>
        <meshBasicMaterial color="lime" />
      </Sphere>
      <Sphere args={[0.2]} position={points[points.length - 1]}>
        <meshBasicMaterial color="red" />
      </Sphere>

      <Grid
        ref={gridRef as any}
        infiniteGrid
        followCamera={false}
        cellSize={1}
        sectionSize={10}
        fadeDistance={1500}
        fadeStrength={1}
        side={THREE.DoubleSide}
        cellColor="#323232"
        sectionColor="#000000"
      />
    </group>
  )
}

// --- 5. Стилі ---
const buttonStyle = (color: string): React.CSSProperties => ({
  background: color,
  border: 'none',
  borderRadius: '6px',
  color: '#000',
  padding: '8px 16px',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontFamily: 'sans-serif',
  fontSize: '14px',
  transition: 'all 0.2s',
  minWidth: '140px',
})

const uiContainerStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '30px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '90%',
  maxWidth: '600px',
  background: 'rgba(10,10,10,0.85)',
  padding: '15px 25px',
  borderRadius: '12px',
  color: 'white',
  fontFamily: 'Segoe UI, Roboto, sans-serif',
  boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
  backdropFilter: 'blur(5px)',
  border: '1px solid rgba(255,255,255,0.1)',
  zIndex: 100,
}

const uiRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '8px',
  alignItems: 'center',
}

const sliderStyle = {
  width: '100%',
  cursor: 'pointer',
  accentColor: '#00bcd4',
  height: '8px',
} as React.CSSProperties

// --- 6. Експорт ---
interface Props {
  flightData?: FlightData[]
  objUrl?: string
  textureUrl?: string
}

export default function DronePlayerWithUI({
  flightData,
  objUrl = '/fpv_cubed.obj',
  textureUrl = '/fpv_3.png',
}: Props) {
  const orbitRef = useRef<OrbitControlsImpl>(null!)
  // animationTimeRef живе тут, щоб бути доступним і в DroneVisualizer, і в обробнику слайдера
  const animationTimeRef = useRef<number>(0)
  const [data, setData] = useState<FlightData[] | null>(flightData ?? null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isCameraLocked, setIsCameraLocked] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [currentIndex, setCurrentIndex] = useState(0)

  return (
    <div style={{ background: '#818080', position: 'relative' }}>
      <Canvas
        camera={{ position: [10, 10, 10], fov: 60, near: 0.1, far: 5000 }}
        shadows
        gl={{ logarithmicDepthBuffer: true, antialias: true }}
      >
        <ambientLight intensity={3} />
        <pointLight position={[15, 15, 15]} intensity={2} />

        <Suspense fallback={<Loader />}>
          <DroneVisualizer
            data={data}
            setData={setData}
            currentIndex={currentIndex}
            setCurrentIndex={setCurrentIndex}
            isPlaying={isPlaying}
            isCameraLocked={isCameraLocked}
            playbackSpeed={playbackSpeed}
            orbitRef={orbitRef}
            animationTimeRef={animationTimeRef}
            objUrl={objUrl}
            textureUrl={textureUrl}
          />
        </Suspense>

        <OrbitControls
          ref={orbitRef}
          makeDefault
          minDistance={1}
          maxDistance={2000}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>

      {data && data.length > 0 && (
        <div style={uiContainerStyle}>
          <div style={uiRowStyle}>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              style={buttonStyle(isPlaying ? '#ff4444' : '#44ff44')}
            >
              {isPlaying ? '⏸ Стоп' : '▶ Старт'}
            </button>

            <button
              onClick={() => setIsCameraLocked(!isCameraLocked)}
              style={buttonStyle(isCameraLocked ? '#00bcd4' : '#666')}
            >
              {isCameraLocked ? '🔓 Відвязати камеру' : '🔒 Привязати камеру'}
            </button>
          </div>

          <div style={uiRowStyle}>
            <label style={{ fontSize: '12px', flex: 1 }}>
              Швидкість: <b>{playbackSpeed.toFixed(1)}x</b>
            </label>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              style={{ ...sliderStyle, flex: 2, marginLeft: '10px' }}
            />
          </div>

          <div style={uiRowStyle}>
            <span>
              Час:{' '}
              <b>
                {(((data[currentIndex]?.TimeUS || 0) - data[0].TimeUS) / 1_000_000).toFixed(2)} с
              </b>
            </span>
            <span>
              Швидкість: <b>{data[currentIndex]?.v_mag?.toFixed(2)} м/с</b>
            </span>
          </div>

          <input
            type="range"
            min="0"
            max={data.length - 1}
            step={0.01}
            value={currentIndex}
            onChange={(e) => {
              const idx = parseInt(e.target.value)
              setCurrentIndex(idx)
              setIsPlaying(false)

              if (data.length > 1) {
                const nextIdx = Math.min(idx + 1, data.length - 1)
                const t1 = data[idx].TimeUS
                const t2 = data[nextIdx].TimeUS
                animationTimeRef.current = t1 + (t2 - t1) * 0.5
              }
            }}
            style={sliderStyle}
          />
        </div>
      )}
    </div>
  )
}