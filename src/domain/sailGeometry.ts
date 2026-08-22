import type {
  BoatClass,
  SailLevel,
  SailPair,
  SailSection,
  SailShape,
} from './types'

export type SailKey = 'main' | 'jib'
export type ProjectionView = 'top' | 'side' | 'aft'

export type SurfacePoint = {
  id: string
  sail: SailKey
  row: number
  column: number
  u: number
  height: number
  x: number
  y: number
  z: number
}

export type SurfaceRow = {
  height: number
  level?: SailLevel
  section: SailSection
  points: SurfacePoint[]
}

export type SailSurface = {
  sail: SailKey
  rows: SurfaceRow[]
}

export type RigSurfaces = Record<SailKey, SailSurface>

export type ProjectedPoint = Pick<
  SurfacePoint,
  'id' | 'sail' | 'row' | 'column' | 'u' | 'height'
> & {
  x: number
  y: number
}

export type ProjectedSurface = {
  sail: SailKey
  view: ProjectionView
  rows: Array<Omit<SurfaceRow, 'points'> & { points: ProjectedPoint[] }>
}

export const SIDE_OBLIQUE_DEGREES = 18
export const SIDE_ELEVATION_DEGREES = 12
export const DRAFT_PEAK_COLUMN = 10

const ROW_HEIGHTS = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1]
const POINT_COUNT = 25

const LEVEL_HEIGHTS: Record<SailLevel, number> = {
  lower: 0.25,
  middle: 0.5,
  upper: 0.75,
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const lerp = (start: number, end: number, amount: number) =>
  start + (end - start) * amount

function mixSection(a: SailSection, b: SailSection, amount: number): SailSection {
  return {
    height: lerp(a.height, b.height, amount),
    draftDepth: lerp(a.draftDepth, b.draftDepth, amount),
    draftPosition: lerp(a.draftPosition, b.draftPosition, amount),
    twist: lerp(a.twist, b.twist, amount),
  }
}

export function sectionAtHeight(shape: SailShape, height: number): SailSection {
  const h = clamp(height, 0, 1)
  const { lower, middle, upper } = shape.sections

  if (h <= lower.height) return { ...lower, height: h }
  if (h <= middle.height) {
    const amount = (h - lower.height) / (middle.height - lower.height)
    return { ...mixSection(lower, middle, amount), height: h }
  }
  if (h <= upper.height) {
    const amount = (h - middle.height) / (upper.height - middle.height)
    return { ...mixSection(middle, upper, amount), height: h }
  }
  return { ...upper, height: h }
}

function chordSample(column: number, peakPosition: number) {
  if (column <= DRAFT_PEAK_COLUMN) {
    return (column / DRAFT_PEAK_COLUMN) * peakPosition
  }
  return peakPosition +
    ((column - DRAFT_PEAK_COLUMN) / (POINT_COUNT - 1 - DRAFT_PEAK_COLUMN)) *
      (1 - peakPosition)
}

export function camberAt(u: number, depth: number, position: number) {
  const peak = clamp(position, 0.05, 0.95)
  if (u <= peak) {
    return Math.sin((u / peak) * (Math.PI / 2)) * depth
  }
  return Math.sin(((1 - u) / (1 - peak)) * (Math.PI / 2)) * depth
}

function planform(
  boat: BoatClass,
  sail: SailKey,
  height: number,
) {
  const classScale = boat === '470' ? 1.035 : 1

  if (sail === 'main') {
    return {
      luffX: -0.018 * height ** 2,
      luffY: 0,
      z: height * 1.2 * classScale,
      chord: Math.max(0.075, 1 - 0.925 * height ** 1.12) * classScale,
    }
  }

  return {
    luffX: (-0.72 + 0.63 * height) * classScale,
    luffY: 0,
    z: (0.04 + height * 0.91) * classScale,
    chord: (0.55 * (1 - height ** 1.06) + 0.018) * classScale,
  }
}

export function buildSailSurface(
  boat: BoatClass,
  sail: SailKey,
  shape: SailShape,
): SailSurface {
  const rows = ROW_HEIGHTS.map((height, rowIndex): SurfaceRow => {
    const section = sectionAtHeight(shape, height)
    const rig = planform(boat, sail, height)
    const angle = ((shape.angle + section.twist) * Math.PI) / 180
    const chordX = Math.cos(angle)
    const chordY = Math.sin(angle)
    const normalX = -chordY
    const normalY = chordX
    const level = (Object.entries(LEVEL_HEIGHTS) as Array<[SailLevel, number]>)
      .find(([, levelHeight]) => levelHeight === height)?.[0]

    const points = Array.from({ length: POINT_COUNT }, (_, column) => {
      const u = chordSample(column, section.draftPosition)
      const camber = camberAt(u, section.draftDepth, section.draftPosition) * rig.chord
      return {
        id: `${sail}:${rowIndex}:${column}`,
        sail,
        row: rowIndex,
        column,
        u,
        height,
        x: rig.luffX + chordX * u * rig.chord + normalX * camber,
        y: rig.luffY + chordY * u * rig.chord + normalY * camber,
        z: rig.z,
      }
    })

    return { height, level, section, points }
  })

  return { sail, rows }
}

export function buildRigSurfaces(boat: BoatClass, pair: SailPair): RigSurfaces {
  return {
    main: buildSailSurface(boat, 'main', pair.main),
    jib: buildSailSurface(boat, 'jib', pair.jib),
  }
}

export function getLevelRow(surface: SailSurface, level: SailLevel) {
  const row = surface.rows.find((candidate) => candidate.level === level)
  if (!row) throw new Error(`Missing ${surface.sail} ${level} surface row`)
  return row
}

function normalizedDegrees(value: number) {
  let result = value
  while (result > 180) result -= 360
  while (result < -180) result += 360
  return result
}

export function measureSurfaceRow(row: SurfaceRow, baseAngle: number) {
  const luff = row.points[0]
  const leech = row.points.at(-1)
  if (!leech) throw new Error('A surface row requires a leech point')
  const chordX = leech.x - luff.x
  const chordY = leech.y - luff.y
  const chordLength = Math.hypot(chordX, chordY)
  const unitX = chordX / chordLength
  const unitY = chordY / chordLength
  const normalX = -unitY
  const normalY = unitX

  let maxDepth = -Infinity
  let draftPosition = 0
  for (const point of row.points) {
    const offsetX = point.x - luff.x
    const offsetY = point.y - luff.y
    const depth = offsetX * normalX + offsetY * normalY
    if (depth > maxDepth) {
      maxDepth = depth
      draftPosition = (offsetX * unitX + offsetY * unitY) / chordLength
    }
  }

  const rowAngle = (Math.atan2(chordY, chordX) * 180) / Math.PI
  return {
    draftDepth: maxDepth / chordLength,
    draftPosition,
    twist: normalizedDegrees(rowAngle - baseAngle),
  }
}

export function projectSurface(
  surface: SailSurface,
  view: ProjectionView,
): ProjectedSurface {
  const oblique = (SIDE_OBLIQUE_DEGREES * Math.PI) / 180
  const elevation = (SIDE_ELEVATION_DEGREES * Math.PI) / 180
  return {
    sail: surface.sail,
    view,
    rows: surface.rows.map((row) => ({
      ...row,
      points: row.points.map((point): ProjectedPoint => {
        if (view === 'top') return { ...point, x: point.x, y: point.y }
        if (view === 'side') {
          return {
            ...point,
            x: point.x * Math.cos(oblique) + point.y * Math.sin(oblique),
            y:
              -point.x * Math.sin(elevation) * Math.sin(oblique) +
              point.y * Math.sin(elevation) * Math.cos(oblique) +
              point.z * Math.cos(elevation),
          }
        }
        return { ...point, x: point.y, y: point.z }
      }),
    })),
  }
}
