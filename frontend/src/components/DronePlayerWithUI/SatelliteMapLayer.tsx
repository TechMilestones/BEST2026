import * as THREE from 'three'
import React, { useEffect } from 'react'
import { useLoader } from '@react-three/fiber'
import { type FlightData } from '../../context/VisualizationContext'

interface SatelliteMapLayerProps {
  data: FlightData[]
  tileRadius?: number
  groundY?: number
}

interface TileMeta {
  id: string
  url: string
  centerX: number
  centerZ: number
  widthM: number
  heightM: number
  quality: 'ultra' | 'hd' | 'lq'
}

interface GeoBounds {
  westLon: number
  eastLon: number
  northLat: number
  southLat: number
}

interface TileRange {
  tileXMin: number
  tileXMax: number
  tileYMin: number
  tileYMax: number
}

const EARTH_METERS_PER_DEG_LAT = 111320
const EARTH_CIRCUMFERENCE_M = 40075016.686
const ULTRA_START_HALF_SIZE_M = 350
const ULTRA_MAX_TILES = 100
const HD_HALF_SIZE_M = 1000
const HD_MAX_TILES = 225
const LQ_MAX_TILES = 196

function lonToTileX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom)
}

function latToTileY(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180
  const n = Math.pow(2, zoom)
  return ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
}

function tileXToLon(tileX: number, zoom: number): number {
  const n = Math.pow(2, zoom)
  return (tileX / n) * 360 - 180
}

function tileYToLat(tileY: number, zoom: number): number {
  const n = Math.pow(2, zoom)
  const y = Math.PI * (1 - (2 * tileY) / n)
  return (180 / Math.PI) * Math.atan(Math.sinh(y))
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function metersToLatDelta(meters: number): number {
  return meters / EARTH_METERS_PER_DEG_LAT
}

function metersToLonDelta(meters: number, latitude: number): number {
  const metersPerDegLon = EARTH_METERS_PER_DEG_LAT * Math.max(0.2, Math.cos((latitude * Math.PI) / 180))
  return meters / metersPerDegLon
}

function createBoundsFromHalfSize(lat: number, lon: number, halfSizeM: number): GeoBounds {
  const latDelta = metersToLatDelta(halfSizeM)
  const lonDelta = metersToLonDelta(halfSizeM, lat)

  return {
    westLon: lon - lonDelta,
    eastLon: lon + lonDelta,
    northLat: lat + latDelta,
    southLat: lat - latDelta,
  }
}

function getTileRange(bounds: GeoBounds, zoom: number): TileRange {
  const tileXMin = Math.floor(lonToTileX(bounds.westLon, zoom))
  const tileXMax = Math.floor(lonToTileX(bounds.eastLon, zoom))
  const tileYMin = Math.floor(latToTileY(bounds.northLat, zoom))
  const tileYMax = Math.floor(latToTileY(bounds.southLat, zoom))

  return {
    tileXMin,
    tileXMax,
    tileYMin,
    tileYMax,
  }
}

function getTileCount(range: TileRange): number {
  const width = Math.max(0, range.tileXMax - range.tileXMin + 1)
  const height = Math.max(0, range.tileYMax - range.tileYMin + 1)
  return width * height
}

function fitZoomForBounds(bounds: GeoBounds, preferredZoom: number, minZoom: number, maxZoom: number, maxTiles: number): number {
  let zoom = clamp(Math.round(preferredZoom), minZoom, maxZoom)
  while (zoom > minZoom && getTileCount(getTileRange(bounds, zoom)) > maxTiles) {
    zoom -= 1
  }
  return zoom
}

function getAdaptiveZoom(latitude: number, data: FlightData[], tileRadius: number): number {
  const maxHorizontalExtent = data.reduce((acc, point) => {
    const px = Number.isFinite(point.x_m) ? Math.abs(point.x_m) : 0
    const py = Number.isFinite(point.y_m) ? Math.abs(point.y_m) : 0
    return Math.max(acc, px, py)
  }, 0)

  const desiredWidthM = Math.max(maxHorizontalExtent * 2.4, 250)
  const cosLat = Math.max(0.2, Math.cos((latitude * Math.PI) / 180))
  const tileCount = tileRadius * 2 + 1
  const zoom = Math.log2((EARTH_CIRCUMFERENCE_M * cosLat * tileCount) / (256 * desiredWidthM))

  return Math.round(clamp(zoom, 14, 19))
}

export const SatelliteMapLayer: React.FC<SatelliteMapLayerProps> = ({
  data,
  tileRadius = 2,
  groundY = -0.06,
}) => {
  const firstGeoPoint = data.find(
    (point) =>
      typeof point.lat === 'number' &&
      Number.isFinite(point.lat) &&
      typeof point.lon === 'number' &&
      Number.isFinite(point.lon)
  )

  const anchor = firstGeoPoint ? { lat: firstGeoPoint.lat as number, lon: firstGeoPoint.lon as number } : null
  const tiles: TileMeta[] = []

  if (anchor) {
    const maxHorizontalExtent = data.reduce((acc, point) => {
      const px = Number.isFinite(point.x_m) ? Math.abs(point.x_m) : 0
      const py = Number.isFinite(point.y_m) ? Math.abs(point.y_m) : 0
      return Math.max(acc, px, py)
    }, 0)

    const ultraBounds = createBoundsFromHalfSize(anchor.lat, anchor.lon, ULTRA_START_HALF_SIZE_M)
    const outerHalfSizeM = Math.max(maxHorizontalExtent + 700, HD_HALF_SIZE_M + 1000)
    const hdBounds = createBoundsFromHalfSize(anchor.lat, anchor.lon, HD_HALF_SIZE_M)
    const lqBounds = createBoundsFromHalfSize(anchor.lat, anchor.lon, outerHalfSizeM)

    const ultraZoom = fitZoomForBounds(ultraBounds, 19, 17, 19, ULTRA_MAX_TILES)
    const preferredLqZoom = getAdaptiveZoom(anchor.lat, data, tileRadius) - 1
    const lqZoom = fitZoomForBounds(lqBounds, preferredLqZoom, 14, 16, LQ_MAX_TILES)
    const hdZoom = fitZoomForBounds(hdBounds, 18, 16, 18, HD_MAX_TILES)

    const metersPerDegLon = EARTH_METERS_PER_DEG_LAT * Math.max(0.2, Math.cos((anchor.lat * Math.PI) / 180))

    const appendTiles = (bounds: GeoBounds, zoom: number, quality: 'ultra' | 'hd' | 'lq') => {
      const n = Math.pow(2, zoom)
      const range = getTileRange(bounds, zoom)

      for (let tileY = range.tileYMin; tileY <= range.tileYMax; tileY += 1) {
        if (tileY < 0 || tileY >= n) continue

        for (let rawX = range.tileXMin; rawX <= range.tileXMax; rawX += 1) {
          const tileX = ((rawX % n) + n) % n

          const westLon = tileXToLon(tileX, zoom)
          const eastLon = tileXToLon(tileX + 1, zoom)
          const northLat = tileYToLat(tileY, zoom)
          const southLat = tileYToLat(tileY + 1, zoom)

          const centerLon = (westLon + eastLon) * 0.5
          const centerLat = (northLat + southLat) * 0.5

          const widthM = Math.abs(eastLon - westLon) * metersPerDegLon
          const heightM = Math.abs(northLat - southLat) * EARTH_METERS_PER_DEG_LAT

          const centerX = (centerLon - anchor.lon) * metersPerDegLon
          const centerNorthM = (centerLat - anchor.lat) * EARTH_METERS_PER_DEG_LAT

          tiles.push({
            id: `${quality}/${zoom}/${tileY}/${tileX}`,
            url: `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${tileY}/${tileX}`,
            centerX,
            centerZ: -centerNorthM,
            widthM,
            heightM,
            quality,
          })
        }
      }
    }

    appendTiles(ultraBounds, ultraZoom, 'ultra')
    appendTiles(lqBounds, lqZoom, 'lq')
    appendTiles(hdBounds, hdZoom, 'hd')
  }

  const urls = tiles.map((tile) => tile.url)
  const textures = useLoader(THREE.TextureLoader, urls) as THREE.Texture[]

  useEffect(() => {
    textures.forEach((texture) => {
      texture.colorSpace = THREE.SRGBColorSpace
      texture.wrapS = THREE.ClampToEdgeWrapping
      texture.wrapT = THREE.ClampToEdgeWrapping
      texture.anisotropy = 16
      texture.needsUpdate = true
    })
  }, [textures])

  if (!anchor || tiles.length === 0) return null

  return (
    <group>
      {tiles.map((tile, index) => (
        <mesh
          key={tile.id}
          position={[
            tile.centerX,
            groundY + (tile.quality === 'ultra' ? 0.02 : tile.quality === 'hd' ? 0.01 : 0),
            tile.centerZ,
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[tile.widthM, tile.heightM]} />
          <meshStandardMaterial
            map={textures[index]}
            toneMapped={false}
            transparent={tile.quality !== 'ultra'}
            opacity={tile.quality === 'lq' ? 0.92 : tile.quality === 'hd' ? 0.96 : 1}
          />
        </mesh>
      ))}
    </group>
  )
}
