import * as THREE from 'three'
import React, { useMemo, useEffect, useRef, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line, Sphere, Grid } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { type FlightData, type TelemetryData } from '../../context/VisualizationContext'
import { DroneModel } from './DroneModel'
import { SatelliteMapLayer } from './SatelliteMapLayer'
import { getStateAtTime } from './utils'

export interface DroneSceneProps {
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
  showSatelliteMap: boolean
  onTelemetry?: (t: TelemetryData) => void
}

export const DroneScene: React.FC<DroneSceneProps> = ({
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
  showSatelliteMap,
  onTelemetry,
}) => {
  const droneRef = useRef<THREE.Group>(null!)
  const gridRef = useRef<THREE.Mesh>(null!)
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

  const hasGeoData = useMemo(
    () => data.some((point) => typeof point.lat === 'number' && Number.isFinite(point.lat) && typeof point.lon === 'number' && Number.isFinite(point.lon)),
    [data]
  )

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
      {showSatelliteMap && hasGeoData && <SatelliteMapLayer data={data} />}

      <Suspense fallback={null}>
        <DroneModel ref={droneRef} objUrl={objUrl} textureUrl={textureUrl} scale={0.005} />
      </Suspense>

      {points.length >= 2 && (
        <>
          <Line points={points} vertexColors={colors} lineWidth={2} />
          <Sphere args={[0.2]} position={points[0]}>
            <meshBasicMaterial color="lime" />
          </Sphere>
          <Sphere args={[0.2]} position={points[points.length - 1]}>
            <meshBasicMaterial color="red" />
          </Sphere>
        </>
      )}

      <Grid
        ref={gridRef}
        visible={!showSatelliteMap}
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
