import * as THREE from 'three'
import React, { useState, useMemo, useEffect, Suspense, useRef } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls, Line, Sphere, Html, useProgress, Grid } from '@react-three/drei'
import { OBJLoader } from 'three-stdlib'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { type FlightData, type TelemetryData } from '../../context/VisualizationContext'

// --- 1. Інтерфейси ---
interface DroneModelProps {
  textureUrl: string
  objUrl: string
  scale?: number | [number, number, number]
  position?: [number, number, number]
}

interface DroneSceneProps {
  data: FlightData[]
  currentIndex: number
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>
  isPlaying: boolean
  isCameraLocked: boolean
  playbackSpeed: number
  orbitRef: React.RefObject<OrbitControlsImpl>
  animationTimeRef: React.MutableRefObject<number>
  objUrl: string
  textureUrl: string
  onTelemetry?: (t: TelemetryData) => void
}

// --- 2. DroneModel ---
const DroneModel = React.forwardRef<THREE.Group, DroneModelProps>(
  ({ textureUrl, objUrl, ...props }, ref) => {
    const colorMap = useLoader(THREE.TextureLoader, textureUrl)
    const obj = useLoader(OBJLoader, objUrl)

    useMemo(() => {
      obj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh
          mesh.material = new THREE.MeshStandardMaterial({
            map: colorMap,
            metalness: 0.6,
            roughness: 0.4,
          })
        }
      })
    }, [obj, colorMap])

    return <primitive ref={ref} object={obj} {...props} />
  }
)
DroneModel.displayName = 'DroneModel'

// --- 3. Loader ---
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

// --- 4. Допоміжні змінні для інтерполяції ---
const _posA = new THREE.Vector3()
const _posB = new THREE.Vector3()
const _quatA = new THREE.Quaternion()
const _quatB = new THREE.Quaternion()

function getInterpolatedState(data: FlightData[], floatIndex: number) {
  const i = Math.max(0, Math.min(floatIndex, data.length - 1))
  const idx1 = Math.floor(i)
  const idx2 = Math.min(idx1 + 1, data.length - 1)
  const weight = i - idx1
  const d1 = data[idx1]
  const d2 = data[idx2]

  _posA.set(d1.x_m, d1.z_m, -d1.y_m)
  _posB.set(d2.x_m, d2.z_m, -d2.y_m)
  _posA.lerp(_posB, weight)

  _quatA.set(-d1.q_y, d1.q_x, d1.q_z, d1.q_w).normalize()
  _quatB.set(-d2.q_y, d2.q_x, d2.q_z, d2.q_w).normalize()

  if (_quatA.dot(_quatB) < 0) {
    _quatB.x *= -1; _quatB.y *= -1; _quatB.z *= -1; _quatB.w *= -1
  }
  _quatA.slerp(_quatB, weight)

  return {
    position: _posA.clone(),
    quaternion: _quatA.clone(),
    v_mag: d1.v_mag + (d2.v_mag - d1.v_mag) * weight,
    z_m: d1.z_m + (d2.z_m - d1.z_m) * weight,
    lat: (d1.lat !== undefined && d2.lat !== undefined)
      ? d1.lat + (d2.lat - d1.lat) * weight
      : d1.x_m + (d2.x_m - d1.x_m) * weight,
    lon: (d1.lon !== undefined && d2.lon !== undefined)
      ? d1.lon + (d2.lon - d1.lon) * weight
      : d1.y_m + (d2.y_m - d1.y_m) * weight,
    TimeUS: d1.TimeUS + (d2.TimeUS - d1.TimeUS) * weight,
  }
}

function getStateAtTime(data: FlightData[], targetTimeUS: number) {
  if (data.length === 0) return null
  if (targetTimeUS <= data[0].TimeUS) return getInterpolatedState(data, 0)
  if (targetTimeUS >= data[data.length - 1].TimeUS) return getInterpolatedState(data, data.length - 1)

  let lo = 0, hi = data.length - 1
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2)
    if (data[mid].TimeUS <= targetTimeUS) lo = mid; else hi = mid
  }
  const timeDiff = data[hi].TimeUS - data[lo].TimeUS
  const frac = timeDiff === 0 ? 0 : (targetTimeUS - data[lo].TimeUS) / timeDiff
  return getInterpolatedState(data, lo + frac)
}

// --- 5. DroneScene ---
const DroneScene: React.FC<DroneSceneProps> = ({
  data,
  currentIndex,
  setCurrentIndex,
  isPlaying,
  isCameraLocked,
  playbackSpeed,
  orbitRef,
  animationTimeRef,
  objUrl,
  textureUrl,
  onTelemetry,
}) => {
  const droneRef = useRef<THREE.Group>(null!)
  const gridRef = useRef<THREE.Object3D>(null!)
  // Ref щоб уникнути зайвих ре-рендерів від onTelemetry
  const onTelemetryRef = useRef(onTelemetry)
  useEffect(() => { onTelemetryRef.current = onTelemetry }, [onTelemetry])

  const { points, colors } = useMemo(() => {
    const pts = data.map((d) => new THREE.Vector3(d.x_m, d.z_m, -d.y_m))
    const maxSpeed = Math.max(...data.map((d) => d.v_mag || 1)) || 1
    const clrs = data.map((d) => {
      const c = new THREE.Color()
      c.setHSL(0.6 * (1 - Math.min(d.v_mag / maxSpeed, 1)), 1, 0.5)
      return c
    })
    return { points: pts, colors: clrs }
  }, [data])

  useFrame((state, delta) => {
    if (data.length < 2) return

    const startTime = data[0].TimeUS
    const endTime = data[data.length - 1].TimeUS
    const totalSec = (endTime - startTime) / 1_000_000

    if (isPlaying) {
      animationTimeRef.current += delta * 1_000_000 * playbackSpeed
      if (animationTimeRef.current > endTime) animationTimeRef.current = startTime
    } else {
      const t1 = data[currentIndex]?.TimeUS ?? startTime
      const t2 = data[Math.min(currentIndex + 1, data.length - 1)]?.TimeUS ?? t1
      animationTimeRef.current = t1 + (t2 - t1) * 0.5
    }

    const stateInterp = getStateAtTime(data, animationTimeRef.current)
    if (!stateInterp || !droneRef.current) return

    const previousPosition = droneRef.current.position.clone()
    droneRef.current.position.copy(stateInterp.position)
    droneRef.current.quaternion.copy(stateInterp.quaternion)

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

    // Викликаємо callback з поточною телеметрією (через ref — не спричиняє ре-рендер)
    if (onTelemetryRef.current) {
      const elapsedSec = (animationTimeRef.current - startTime) / 1_000_000
      onTelemetryRef.current({
        elapsedSec,
        remainingSec: totalSec - elapsedSec,
        speedMs: stateInterp.v_mag,
        altitudeM: stateInterp.z_m,
        lat: stateInterp.lat,
        lon: stateInterp.lon,
      })
    }
  })

  return (
    <group>
      <Suspense fallback={null}>
        <DroneModel ref={droneRef} objUrl={objUrl} textureUrl={textureUrl} scale={0.005} />
      </Suspense>

      {points.length >= 2 && (
        <>
          <Line points={points} vertexColors={colors as any} lineWidth={2} />
          <Sphere args={[0.2]} position={points[0]}>
            <meshBasicMaterial color="lime" />
          </Sphere>
          <Sphere args={[0.2]} position={points[points.length - 1]}>
            <meshBasicMaterial color="red" />
          </Sphere>
        </>
      )}

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

// --- 6. Стилі ---
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

// --- 7. Експорт ---
interface Props {
  flightData?: FlightData[]
  objUrl?: string
  textureUrl?: string
  /** Викликається щокадру з поточними даними телеметрії */
  onTelemetry?: (t: TelemetryData) => void
}

export default function DronePlayerWithUI({
  flightData,
  objUrl = '/fpv_cubed.obj',
  textureUrl = '/fpv_3.png',
  onTelemetry,
}: Props) {
  const orbitRef = useRef<OrbitControlsImpl>(null!)
  const animationTimeRef = useRef<number>(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isCameraLocked, setIsCameraLocked] = useState(true)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (flightData && flightData.length > 0) {
      setCurrentIndex(0)
      setIsPlaying(false)
      animationTimeRef.current = flightData[0].TimeUS
    }
  }, [flightData])

  const hasData = flightData && flightData.length > 0

  return (
    <div style={{ width: '100%', aspectRatio: '16/9', background: '#818080', position: 'relative' }}>
      <Canvas
        camera={{ position: [10, 10, 10], fov: 60, near: 0.1, far: 5000 }}
        shadows
        gl={{ logarithmicDepthBuffer: true, antialias: true }}
      >
        <ambientLight intensity={3} />
        <pointLight position={[15, 15, 15]} intensity={2} />

        <Suspense fallback={<Loader />}>
          {hasData && (
            <DroneScene
              data={flightData}
              currentIndex={currentIndex}
              setCurrentIndex={setCurrentIndex}
              isPlaying={isPlaying}
              isCameraLocked={isCameraLocked}
              playbackSpeed={playbackSpeed}
              orbitRef={orbitRef}
              animationTimeRef={animationTimeRef}
              objUrl={objUrl}
              textureUrl={textureUrl}
              onTelemetry={onTelemetry}
            />
          )}
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

      {hasData && (
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
      )}
    </div>
  )
}
