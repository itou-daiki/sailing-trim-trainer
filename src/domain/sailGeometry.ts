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
  battenStartU?: number
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
export const AFT_OBLIQUE_DEGREES = 35
export const DRAFT_PEAK_COLUMN = 10
export const SAIL_GEOMETRY_UNIT_MM = 1900

type MainCrossWidth = {
  height: number
  widthMm: number
}

export type SailOutlineStation = {
  height: number
  /** Chord as a ratio of the measured foot. */
  chordRatio: number
  /** Aft rake of the luff as a ratio of the measured foot. */
  luffRakeRatio: number
}

type BattenStation = {
  height: number
  startU: number
}

type ClassSailSpecification = {
  main: {
    leechMm: number
    footMm: number
    crossWidths: MainCrossWidth[]
    outline: SailOutlineStation[]
    battens: BattenStation[]
  }
  jib: {
    luffMm: number
    leechMm: number
    footMm: number
    topWidthMm: number
    tackFromMastMm: number
    outline: SailOutlineStation[]
    battens: BattenStation[]
  }
}

/**
 * The rule dimensions remain the hard dimensional envelope. The outline stations
 * are normalized from the current North Sails M-12 (420) and N16-L18 (470)
 * product silhouettes. This is deliberately separate from ERS cross widths:
 * quarter/half widths are measured from leech points and are not horizontal
 * chords at 25/50/75% height.
 */
export const CLASS_SAIL_SPECIFICATIONS: Record<BoatClass, ClassSailSpecification> = {
  '420': {
    main: {
      leechMm: 5400,
      footMm: 1920,
      crossWidths: [
        { height: 0, widthMm: 1920 },
        { height: 0.25, widthMm: 2130 },
        { height: 0.5, widthMm: 1630 },
        { height: 0.75, widthMm: 995 },
        { height: 1 - 600 / 5400, widthMm: 480 },
        { height: 1, widthMm: 115 },
      ],
      outline: [
        { height: 0, chordRatio: 1, luffRakeRatio: 0 },
        { height: 0.0625, chordRatio: 0.967, luffRakeRatio: 0.004 },
        { height: 0.125, chordRatio: 0.926, luffRakeRatio: 0.009 },
        { height: 0.1875, chordRatio: 0.884, luffRakeRatio: 0.017 },
        { height: 0.25, chordRatio: 0.842, luffRakeRatio: 0.024 },
        { height: 0.3125, chordRatio: 0.794, luffRakeRatio: 0.033 },
        { height: 0.375, chordRatio: 0.748, luffRakeRatio: 0.040 },
        { height: 0.4375, chordRatio: 0.699, luffRakeRatio: 0.051 },
        { height: 0.5, chordRatio: 0.649, luffRakeRatio: 0.061 },
        { height: 0.5625, chordRatio: 0.599, luffRakeRatio: 0.072 },
        { height: 0.625, chordRatio: 0.544, luffRakeRatio: 0.083 },
        { height: 0.6875, chordRatio: 0.483, luffRakeRatio: 0.094 },
        { height: 0.75, chordRatio: 0.421, luffRakeRatio: 0.107 },
        { height: 0.8125, chordRatio: 0.351, luffRakeRatio: 0.120 },
        { height: 0.875, chordRatio: 0.246, luffRakeRatio: 0.134 },
        { height: 0.9375, chordRatio: 0.142, luffRakeRatio: 0.149 },
        { height: 1, chordRatio: 115 / 1920, luffRakeRatio: 0.167 },
      ],
      battens: [
        { height: 1 - 4220 / 5400, startU: 0.74 },
        { height: 1 - 3220 / 5400, startU: 0.59 },
        { height: 1 - 2220 / 5400, startU: 0.55 },
        { height: 1 - 1220 / 5400, startU: 0.1 },
      ],
    },
    jib: {
      luffMm: 3500,
      leechMm: 3200,
      footMm: 1750,
      topWidthMm: 40,
      tackFromMastMm: -1205,
      outline: [
        { height: 0, chordRatio: 1, luffRakeRatio: 0 },
        { height: 0.0625, chordRatio: 0.939, luffRakeRatio: 0 },
        { height: 0.125, chordRatio: 0.878, luffRakeRatio: 0 },
        { height: 0.1875, chordRatio: 0.817, luffRakeRatio: 0 },
        { height: 0.25, chordRatio: 0.756, luffRakeRatio: 0 },
        { height: 0.3125, chordRatio: 0.695, luffRakeRatio: 0 },
        { height: 0.375, chordRatio: 0.634, luffRakeRatio: 0 },
        { height: 0.4375, chordRatio: 0.573, luffRakeRatio: 0 },
        { height: 0.5, chordRatio: 0.511, luffRakeRatio: 0 },
        { height: 0.5625, chordRatio: 0.45, luffRakeRatio: 0 },
        { height: 0.625, chordRatio: 0.389, luffRakeRatio: 0 },
        { height: 0.6875, chordRatio: 0.328, luffRakeRatio: 0 },
        { height: 0.75, chordRatio: 0.267, luffRakeRatio: 0 },
        { height: 0.8125, chordRatio: 0.206, luffRakeRatio: 0 },
        { height: 0.875, chordRatio: 0.145, luffRakeRatio: 0 },
        { height: 0.9375, chordRatio: 0.084, luffRakeRatio: 0 },
        { height: 1, chordRatio: 40 / 1750, luffRakeRatio: 0 },
      ],
      battens: [
        { height: 0.25, startU: 0.8 },
        { height: 0.5, startU: 0.8 },
        { height: 0.75, startU: 0.8 },
      ],
    },
  },
  '470': {
    main: {
      leechMm: 6265,
      footMm: 2200,
      crossWidths: [
        { height: 0, widthMm: 2200 },
        { height: 0.25, widthMm: 2340 },
        { height: 0.5, widthMm: 1790 },
        { height: 0.75, widthMm: 1050 },
        { height: 1, widthMm: 140 },
      ],
      outline: [
        { height: 0, chordRatio: 1, luffRakeRatio: 0 },
        { height: 0.0625, chordRatio: 0.978, luffRakeRatio: 0.007 },
        { height: 0.125, chordRatio: 0.945, luffRakeRatio: 0.010 },
        { height: 0.1875, chordRatio: 0.909, luffRakeRatio: 0.014 },
        { height: 0.25, chordRatio: 0.874, luffRakeRatio: 0.020 },
        { height: 0.3125, chordRatio: 0.823, luffRakeRatio: 0.027 },
        { height: 0.375, chordRatio: 0.773, luffRakeRatio: 0.035 },
        { height: 0.4375, chordRatio: 0.722, luffRakeRatio: 0.045 },
        { height: 0.5, chordRatio: 0.672, luffRakeRatio: 0.053 },
        { height: 0.5625, chordRatio: 0.604, luffRakeRatio: 0.065 },
        { height: 0.625, chordRatio: 0.534, luffRakeRatio: 0.078 },
        { height: 0.6875, chordRatio: 0.464, luffRakeRatio: 0.093 },
        { height: 0.75, chordRatio: 0.393, luffRakeRatio: 0.108 },
        { height: 0.8125, chordRatio: 0.304, luffRakeRatio: 0.123 },
        { height: 0.875, chordRatio: 0.211, luffRakeRatio: 0.139 },
        { height: 0.9375, chordRatio: 0.115, luffRakeRatio: 0.157 },
        { height: 1, chordRatio: 140 / 2200, luffRakeRatio: 0.181 },
      ],
      battens: [
        { height: 0.25, startU: 0.58 },
        { height: 0.5, startU: 0.48 },
        { height: 0.72, startU: 0.08 },
      ],
    },
    jib: {
      luffMm: 4100,
      leechMm: 3750,
      footMm: 1955,
      topWidthMm: 30,
      tackFromMastMm: -1545,
      outline: [
        { height: 0, chordRatio: 1, luffRakeRatio: 0 },
        { height: 0.0625, chordRatio: 0.938, luffRakeRatio: 0 },
        { height: 0.125, chordRatio: 0.877, luffRakeRatio: 0 },
        { height: 0.1875, chordRatio: 0.815, luffRakeRatio: 0 },
        { height: 0.25, chordRatio: 0.754, luffRakeRatio: 0 },
        { height: 0.3125, chordRatio: 0.692, luffRakeRatio: 0 },
        { height: 0.375, chordRatio: 0.631, luffRakeRatio: 0 },
        { height: 0.4375, chordRatio: 0.569, luffRakeRatio: 0 },
        { height: 0.5, chordRatio: 0.508, luffRakeRatio: 0 },
        { height: 0.5625, chordRatio: 0.446, luffRakeRatio: 0 },
        { height: 0.625, chordRatio: 0.385, luffRakeRatio: 0 },
        { height: 0.6875, chordRatio: 0.323, luffRakeRatio: 0 },
        { height: 0.75, chordRatio: 0.262, luffRakeRatio: 0 },
        { height: 0.8125, chordRatio: 0.2, luffRakeRatio: 0 },
        { height: 0.875, chordRatio: 0.138, luffRakeRatio: 0 },
        { height: 0.9375, chordRatio: 0.077, luffRakeRatio: 0 },
        { height: 1, chordRatio: 30 / 1955, luffRakeRatio: 0 },
      ],
      battens: [
        { height: 0.25, startU: 0.8 },
        { height: 0.5, startU: 0.8 },
        { height: 0.75, startU: 0.8 },
      ],
    },
  },
}

const ROW_HEIGHTS = Array.from({ length: 17 }, (_, index) => index / 16)
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

function stationAtHeight(stations: SailOutlineStation[], height: number) {
  const h = clamp(height, 0, 1)
  const upperIndex = stations.findIndex((station) => station.height >= h)
  if (upperIndex <= 0) return stations[0]
  const lower = stations[upperIndex - 1]
  const upper = stations[upperIndex]
  const amount = (h - lower.height) / (upper.height - lower.height)
  return {
    height: h,
    chordRatio: lerp(lower.chordRatio, upper.chordRatio, amount),
    luffRakeRatio: lerp(lower.luffRakeRatio, upper.luffRakeRatio, amount),
  }
}

function jibTriangle(specification: ClassSailSpecification['jib']) {
  const { luffMm, leechMm, footMm } = specification
  const headOffsetMm =
    (luffMm ** 2 + footMm ** 2 - leechMm ** 2) / (2 * footMm)
  return {
    headOffsetMm,
    headHeightMm: Math.sqrt(Math.max(0, luffMm ** 2 - headOffsetMm ** 2)),
  }
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
  mastBend: number,
) {
  const specification = CLASS_SAIL_SPECIFICATIONS[boat]

  if (sail === 'main') {
    const outline = stationAtHeight(specification.main.outline, height)
    const foot = specification.main.footMm / SAIL_GEOMETRY_UNIT_MM
    const luffX =
      foot * outline.luffRakeRatio - mastBend * Math.sin(Math.PI * height)
    return {
      luffX,
      luffY: 0,
      z: (height * specification.main.leechMm) / SAIL_GEOMETRY_UNIT_MM,
      chord: foot * outline.chordRatio,
    }
  }

  const jib = specification.jib
  const triangle = jibTriangle(jib)
  const outline = stationAtHeight(jib.outline, height)
  const tackX = jib.tackFromMastMm / SAIL_GEOMETRY_UNIT_MM
  return {
    luffX: tackX + (triangle.headOffsetMm / SAIL_GEOMETRY_UNIT_MM) * height,
    luffY: 0,
    z: 0.04 + (triangle.headHeightMm / SAIL_GEOMETRY_UNIT_MM) * height,
    chord: (jib.footMm / SAIL_GEOMETRY_UNIT_MM) * outline.chordRatio,
  }
}

export function buildSailSurface(
  boat: BoatClass,
  sail: SailKey,
  shape: SailShape,
): SailSurface {
  const battens = CLASS_SAIL_SPECIFICATIONS[boat][sail].battens
  const rowHeights = [...new Set([
    ...ROW_HEIGHTS,
    ...battens.map((batten) => batten.height),
  ])].sort((a, b) => a - b)
  const rows = rowHeights.map((height, rowIndex): SurfaceRow => {
    const section = sectionAtHeight(shape, height)
    const rig = planform(boat, sail, height, shape.mastBend)
    const angle = ((shape.angle + section.twist) * Math.PI) / 180
    const chordX = Math.cos(angle)
    const chordY = Math.sin(angle)
    const normalX = -chordY
    const normalY = chordX
    const level = (Object.entries(LEVEL_HEIGHTS) as Array<[SailLevel, number]>)
      .find(([, levelHeight]) => levelHeight === height)?.[0]
    const battenStartU = battens.find(
      (batten) => Math.abs(batten.height - height) < 1e-9,
    )?.startU

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

    return { height, level, battenStartU, section, points }
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
  const entryPoint = row.points[1]
  const exitPoint = row.points.at(-2)
  if (!entryPoint || !exitPoint) throw new Error('A surface row requires edge tangent points')
  const tangentAngle = (from: SurfacePoint, to: SurfacePoint) => {
    const deltaX = to.x - from.x
    const deltaY = to.y - from.y
    const along = deltaX * unitX + deltaY * unitY
    const normal = deltaX * normalX + deltaY * normalY
    return (Math.atan2(normal, along) * 180) / Math.PI
  }
  return {
    draftDepth: maxDepth / chordLength,
    draftPosition,
    twist: normalizedDegrees(rowAngle - baseAngle),
    entryAngle: Math.abs(tangentAngle(luff, entryPoint)),
    exitAngle: Math.abs(tangentAngle(exitPoint, leech)),
  }
}

export function projectSurface(
  surface: SailSurface,
  view: ProjectionView,
): ProjectedSurface {
  return {
    sail: surface.sail,
    view,
    rows: surface.rows.map((row) => ({
      ...row,
      points: row.points.map((point): ProjectedPoint => ({
        ...point,
        ...projectCoordinate(point, view),
      })),
    })),
  }
}

export function projectCoordinate(
  point: { x: number; y: number; z: number },
  view: ProjectionView,
) {
  const oblique = (SIDE_OBLIQUE_DEGREES * Math.PI) / 180
  const elevation = (SIDE_ELEVATION_DEGREES * Math.PI) / 180
  const aftOblique = (AFT_OBLIQUE_DEGREES * Math.PI) / 180
  if (view === 'top') return { x: point.x, y: point.y }
  if (view === 'side') {
    return {
      x: point.x * Math.cos(oblique) + point.y * Math.sin(oblique),
      y:
        -point.x * Math.sin(elevation) * Math.sin(oblique) +
        point.y * Math.sin(elevation) * Math.cos(oblique) +
        point.z * Math.cos(elevation),
    }
  }
  return {
    x: point.y * Math.cos(aftOblique) + point.x * Math.sin(aftOblique),
    y: point.z,
  }
}
