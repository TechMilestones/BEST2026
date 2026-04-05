import { useState, useEffect, Suspense, useRef, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { type FlightData, type TelemetryData } from '../../context/VisualizationContext'

import { DroneScene } from './DroneScene'
import { DronePlayerUI } from './DronePlayerUI'
import { Loader } from './DroneModel'

interface Props {
  flightData?: FlightData[]
  objUrl?: string
  textureUrl?: string
  scale?: number | [number, number, number]
  /** Викликається щокадру з поточними даними телеметрії */
  onTelemetry?: (t: TelemetryData) => void
}

export default function DronePlayerWithUI({
  flightData,
  objUrl = '/fpv_cubed.obj',
  textureUrl = '/fpv_3.png',
  scale,
  onTelemetry,
}: Props) {
  const orbitRef = useRef<OrbitControlsImpl>(null!)
  const animationTimeRef = useRef<number>(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isCameraLocked, setIsCameraLocked] = useState(true)
  const [isSatelliteMapEnabled, setIsSatelliteMapEnabled] = useState(true)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (flightData && flightData.length > 0) {
      setCurrentIndex(0)
      setIsPlaying(false)
      animationTimeRef.current = flightData[0].TimeUS
    }
  }, [flightData])

  const hasGeoData = useMemo(
    () => (flightData ?? []).some(
      (point) =>
        typeof point.lat === 'number' &&
        Number.isFinite(point.lat) &&
        typeof point.lon === 'number' &&
        Number.isFinite(point.lon)
    ),
    [flightData]
  )

  const hasData = !!(flightData && flightData.length > 0)

  return (
    <div style={{ width: '100%', aspectRatio: '16/9', background: '#818080', position: 'relative', borderBottomLeftRadius: "10px", borderBottomRightRadius: "10px" }}>
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
              data={flightData!}
              currentIndex={currentIndex}
              setCurrentIndex={setCurrentIndex}
              isPlaying={isPlaying}
              isCameraLocked={isCameraLocked}
              playbackSpeed={playbackSpeed}
              orbitRef={orbitRef}
              animationTimeRef={animationTimeRef}
              objUrl={objUrl}
              textureUrl={textureUrl}
              scale={scale}
              showSatelliteMap={isSatelliteMapEnabled && hasGeoData}
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
        <DronePlayerUI
          flightData={flightData!}
          currentIndex={currentIndex}
          setCurrentIndex={setCurrentIndex}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          isCameraLocked={isCameraLocked}
          setIsCameraLocked={setIsCameraLocked}
          playbackSpeed={playbackSpeed}
          setPlaybackSpeed={setPlaybackSpeed}
          isSatelliteMapEnabled={isSatelliteMapEnabled && hasGeoData}
          setIsSatelliteMapEnabled={setIsSatelliteMapEnabled}
          canUseSatelliteMap={hasGeoData}
          animationTimeRef={animationTimeRef}
        />
      )}
    </div>
  )
}
