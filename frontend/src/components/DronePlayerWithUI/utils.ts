import * as THREE from 'three'
import { type FlightData } from '../../context/VisualizationContext'

const _posA = new THREE.Vector3()
const _posB = new THREE.Vector3()
const _quatA = new THREE.Quaternion()
const _quatB = new THREE.Quaternion()

export function getInterpolatedState(data: FlightData[], floatIndex: number) {
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

export function getStateAtTime(data: FlightData[], targetTimeUS: number) {
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
