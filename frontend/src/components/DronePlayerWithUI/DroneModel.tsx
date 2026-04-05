import * as THREE from 'three'
import React, { useMemo } from 'react'
import { useLoader, useFrame } from '@react-three/fiber'
import { OBJLoader } from 'three-stdlib'
import { Html, useProgress } from '@react-three/drei'

export interface DroneModelProps {
  textureUrl: string
  objUrl: string
  scale?: number | [number, number, number]
  position?: [number, number, number]
}

export const DroneModel = React.forwardRef<THREE.Group, DroneModelProps>(
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

export function Loader() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div style={{ color: 'white', background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '4px' }}>
        {progress.toFixed(0)}% loaded
      </div>
    </Html>
  )
}
