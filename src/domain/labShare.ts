import { targetControls } from './trimModel'
import type { BoatClass, ControlKey, TrimControls } from './types'

export type LabSnapshot = {
  boat: BoatClass
  angle: number
  windSpeed: number
  controls: TrimControls
}

const COMMON_CONTROLS: ControlKey[] = ['vang', 'cunningham', 'outhaul']
const CLASS_CONTROLS: Record<BoatClass, ControlKey[]> = {
  '420': ['chock', 'jibHeight'],
  '470': ['forePuller', 'aftPuller', 'jibLeadForeAft'],
}

function numberInRange(value: string | null, min: number, max: number) {
  if (value === null || value.trim() === '') return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return undefined
  return parsed
}

export function parseLabSnapshot(search: string): LabSnapshot | undefined {
  const params = new URLSearchParams(search)
  if (params.get('mode') !== 'lab') return undefined

  const rawBoat = params.get('boat')
  if (rawBoat !== '420' && rawBoat !== '470') return undefined
  const angle = numberInRange(params.get('twa'), 40, 160)
  const windSpeed = numberInRange(params.get('tws'), 4, 22)
  if (angle === undefined || windSpeed === undefined) return undefined

  const controls = targetControls(rawBoat, angle, windSpeed)
  for (const key of [...COMMON_CONTROLS, ...CLASS_CONTROLS[rawBoat]]) {
    const value = numberInRange(params.get(key), 0, 100)
    if (value === undefined) return undefined
    controls[key] = Math.round(value)
  }

  return { boat: rawBoat, angle, windSpeed, controls }
}

export function labSnapshotUrl(currentHref: string, snapshot: LabSnapshot) {
  const url = new URL(currentHref)
  url.search = ''
  url.hash = ''
  url.searchParams.set('mode', 'lab')
  url.searchParams.set('boat', snapshot.boat)
  url.searchParams.set('twa', String(snapshot.angle))
  url.searchParams.set('tws', String(snapshot.windSpeed))
  for (const key of [...COMMON_CONTROLS, ...CLASS_CONTROLS[snapshot.boat]]) {
    url.searchParams.set(key, String(Math.round(snapshot.controls[key])))
  }
  return url.toString()
}
