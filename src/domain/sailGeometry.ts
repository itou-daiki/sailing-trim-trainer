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
  rotationDegrees: number
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
/** Zero degrees: orthographic camera on the hull centreline, looking forward. */
export const AFT_VIEW_DEGREES = 0
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
    /** Maximum distance between the mast lower and upper points. */
    luffMm: number
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
 * are normalized from the current North Sails M-12 (420) and N17-L26 (470)
 * product silhouettes. This is deliberately separate from ERS cross widths:
 * quarter/half widths are measured from leech points and are not horizontal
 * chords at 25/50/75% height.
 */
export const CLASS_SAIL_SPECIFICATIONS: Record<BoatClass, ClassSailSpecification> = {
  '420': {
    main: {
      luffMm: 4900,
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
      luffMm: 5750,
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
        { height: 0.0625, chordRatio: 0.969, luffRakeRatio: 0.002 },
        { height: 0.125, chordRatio: 0.934, luffRakeRatio: 0.008 },
        { height: 0.1875, chordRatio: 0.899, luffRakeRatio: 0.014 },
        { height: 0.25, chordRatio: 0.86, luffRakeRatio: 0.019 },
        { height: 0.3125, chordRatio: 0.812, luffRakeRatio: 0.027 },
        { height: 0.375, chordRatio: 0.764, luffRakeRatio: 0.035 },
        { height: 0.4375, chordRatio: 0.715, luffRakeRatio: 0.045 },
        { height: 0.5, chordRatio: 0.663, luffRakeRatio: 0.054 },
        { height: 0.5625, chordRatio: 0.599, luffRakeRatio: 0.066 },
        { height: 0.625, chordRatio: 0.533, luffRakeRatio: 0.079 },
        { height: 0.6875, chordRatio: 0.467, luffRakeRatio: 0.093 },
        { height: 0.75, chordRatio: 0.399, luffRakeRatio: 0.109 },
        { height: 0.8125, chordRatio: 0.312, luffRakeRatio: 0.122 },
        { height: 0.875, chordRatio: 0.225, luffRakeRatio: 0.138 },
        { height: 0.9375, chordRatio: 0.134, luffRakeRatio: 0.155 },
        { height: 1, chordRatio: 140 / 2200, luffRakeRatio: 0.178 },
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

export function sectionAtHeight(shape: SailShape, height: number): SailSection {
  const h = clamp(height, 0, 1)
  const { lower, middle, upper } = shape.sections
  const interpolate = (key: 'draftDepth' | 'draftPosition' | 'twist') => {
    const points = [lower, middle, upper]
    return points.reduce((sum, point, index) => {
      const others = points.filter((_, otherIndex) => otherIndex !== index)
      const basis = others.reduce(
        (product, other) =>
          product * ((h - other.height) / (point.height - other.height)),
        1,
      )
      return sum + point[key] * basis
    }, 0)
  }

  return {
    height: h,
    draftDepth: clamp(interpolate('draftDepth'), 0.02, 0.3),
    draftPosition: clamp(interpolate('draftPosition'), 0.05, 0.95),
    twist: clamp(interpolate('twist'), -20, 50),
  }
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

type Vector3 = { x: number; y: number; z: number }

const addVector = (a: Vector3, b: Vector3): Vector3 => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
})

const scaleVector = (vector: Vector3, scale: number): Vector3 => ({
  x: vector.x * scale,
  y: vector.y * scale,
  z: vector.z * scale,
})

const dotVector = (a: Vector3, b: Vector3) =>
  a.x * b.x + a.y * b.y + a.z * b.z

const crossVector = (a: Vector3, b: Vector3): Vector3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
})

const vectorLength = (vector: Vector3) =>
  Math.hypot(vector.x, vector.y, vector.z)

const normalizeVector = (vector: Vector3): Vector3 => {
  const length = vectorLength(vector)
  if (length < 1e-12) return { x: 1, y: 0, z: 0 }
  return scaleVector(vector, 1 / length)
}

function rotateAroundAxis(vector: Vector3, axis: Vector3, angle: number): Vector3 {
  const unitAxis = normalizeVector(axis)
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  return addVector(
    addVector(
      scaleVector(vector, cosine),
      scaleVector(crossVector(unitAxis, vector), sine),
    ),
    scaleVector(unitAxis, dotVector(unitAxis, vector) * (1 - cosine)),
  )
}

function jibTriangle(specification: ClassSailSpecification['jib']) {
  const { luffMm, leechMm, footMm } = specification
  const clewAlongLuffMm =
    (luffMm ** 2 + footMm ** 2 - leechMm ** 2) / (2 * luffMm)
  return {
    clewAlongLuffMm,
    clewPerpendicularMm: Math.sqrt(
      Math.max(0, footMm ** 2 - clewAlongLuffMm ** 2),
    ),
  }
}

export function camberAt(u: number, depth: number, position: number) {
  const peak = clamp(position, 0.05, 0.95)
  if (u <= peak) {
    return Math.sin((u / peak) * (Math.PI / 2)) * depth
  }
  return Math.sin(((1 - u) / (1 - peak)) * (Math.PI / 2)) * depth
}

function mainLuffPoint(
  boat: BoatClass,
  height: number,
  mastBend: number,
): Vector3 {
  const specification = CLASS_SAIL_SPECIFICATIONS[boat]
  const outline = stationAtHeight(specification.main.outline, height)
  const foot = specification.main.footMm / SAIL_GEOMETRY_UNIT_MM
  return {
    x: foot * outline.luffRakeRatio - mastBend * Math.sin(Math.PI * height),
    y: 0,
    z: (height * specification.main.luffMm) / SAIL_GEOMETRY_UNIT_MM,
  }
}

function planform(
  boat: BoatClass,
  sail: SailKey,
  height: number,
  mastBend: number,
  rotation: number,
) {
  const specification = CLASS_SAIL_SPECIFICATIONS[boat]
  if (sail === 'main') {
    const outline = stationAtHeight(specification.main.outline, height)
    const foot = specification.main.footMm / SAIL_GEOMETRY_UNIT_MM
    const chordDirection = { x: Math.cos(rotation), y: Math.sin(rotation), z: 0 }
    return {
      luff: mainLuffPoint(boat, height, mastBend),
      chord: foot * outline.chordRatio,
      chordDirection,
      normalDirection: { x: -chordDirection.y, y: chordDirection.x, z: 0 },
    }
  }

  const jib = specification.jib
  const triangle = jibTriangle(jib)
  const outline = stationAtHeight(jib.outline, height)
  const luffLength = jib.luffMm / SAIL_GEOMETRY_UNIT_MM
  const tack = {
    x: jib.tackFromMastMm / SAIL_GEOMETRY_UNIT_MM,
    y: 0,
    z: 0.015,
  }

  // The jib head follows the current mainsail luff instead of floating in front
  // of the mast. Iteration is required because its height depends on the fixed
  // luff length while the mast's fore/aft coordinate depends on that height.
  let headX = 0
  let headZ = tack.z
  for (let iteration = 0; iteration < 8; iteration += 1) {
    const deltaX = headX - tack.x
    headZ = tack.z + Math.sqrt(Math.max(0, luffLength ** 2 - deltaX ** 2))
    const mainHeight = clamp(
      (headZ * SAIL_GEOMETRY_UNIT_MM) / specification.main.luffMm,
      0,
      1,
    )
    headX = mainLuffPoint(boat, mainHeight, mastBend).x
  }
  const head = { x: headX, y: 0, z: headZ }
  const luffVector = {
    x: head.x - tack.x,
    y: 0,
    z: head.z - tack.z,
  }
  const luffDirection = normalizeVector(luffVector)
  const centrelinePerpendicular = normalizeVector({
    x: luffDirection.z,
    y: 0,
    z: -luffDirection.x,
  })
  const rotatedPerpendicular = rotateAroundAxis(
    centrelinePerpendicular,
    luffDirection,
    rotation,
  )
  const along =
    ((1 - height) * triangle.clewAlongLuffMm) / SAIL_GEOMETRY_UNIT_MM
  const perpendicular =
    ((1 - height) * triangle.clewPerpendicularMm + height * jib.topWidthMm) /
    SAIL_GEOMETRY_UNIT_MM
  const chordDirection = normalizeVector(
    addVector(
      scaleVector(luffDirection, along),
      scaleVector(rotatedPerpendicular, perpendicular),
    ),
  )
  return {
    luff: addVector(tack, scaleVector(luffVector, height)),
    chord: (jib.footMm / SAIL_GEOMETRY_UNIT_MM) * outline.chordRatio,
    chordDirection,
    normalDirection: normalizeVector(crossVector(luffDirection, chordDirection)),
  }
}

export function buildSailSurface(
  boat: BoatClass,
  sail: SailKey,
  shape: SailShape,
  rigMastBend = shape.mastBend,
): SailSurface {
  const battens = CLASS_SAIL_SPECIFICATIONS[boat][sail].battens
  const rowHeights = [...new Set([
    ...ROW_HEIGHTS,
    ...battens.map((batten) => batten.height),
  ])].sort((a, b) => a - b)
  const rows = rowHeights.map((height, rowIndex): SurfaceRow => {
    const section = sectionAtHeight(shape, height)
    const angle = ((shape.angle + section.twist) * Math.PI) / 180
    const rig = planform(boat, sail, height, rigMastBend, angle)
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
        x:
          rig.luff.x +
          rig.chordDirection.x * u * rig.chord +
          rig.normalDirection.x * camber,
        y:
          rig.luff.y +
          rig.chordDirection.y * u * rig.chord +
          rig.normalDirection.y * camber,
        z:
          rig.luff.z +
          rig.chordDirection.z * u * rig.chord +
          rig.normalDirection.z * camber,
      }
    })

    return {
      height,
      level,
      battenStartU,
      rotationDegrees: shape.angle + section.twist,
      section,
      points,
    }
  })

  return { sail, rows }
}

export function buildRigSurfaces(boat: BoatClass, pair: SailPair): RigSurfaces {
  return {
    main: buildSailSurface(boat, 'main', pair.main, pair.main.mastBend),
    jib: buildSailSurface(boat, 'jib', pair.jib, pair.main.mastBend),
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
  const chordVector = {
    x: leech.x - luff.x,
    y: leech.y - luff.y,
    z: leech.z - luff.z,
  }
  const chordLength = vectorLength(chordVector)
  const chordDirection = normalizeVector(chordVector)

  let maxDepth = -Infinity
  let draftPosition = 0
  for (const point of row.points) {
    const offset = {
      x: point.x - luff.x,
      y: point.y - luff.y,
      z: point.z - luff.z,
    }
    const along = dotVector(offset, chordDirection)
    const normalOffset = addVector(
      offset,
      scaleVector(chordDirection, -along),
    )
    const depth = vectorLength(normalOffset)
    if (depth > maxDepth) {
      maxDepth = depth
      draftPosition = along / chordLength
    }
  }

  const entryPoint = row.points[1]
  const exitPoint = row.points.at(-2)
  if (!entryPoint || !exitPoint) throw new Error('A surface row requires edge tangent points')
  const tangentAngle = (from: SurfacePoint, to: SurfacePoint) => {
    const delta = {
      x: to.x - from.x,
      y: to.y - from.y,
      z: to.z - from.z,
    }
    const along = dotVector(delta, chordDirection)
    const normal = vectorLength(addVector(
      delta,
      scaleVector(chordDirection, -along),
    ))
    return (Math.atan2(normal, along) * 180) / Math.PI
  }
  return {
    draftDepth: maxDepth / chordLength,
    draftPosition,
    twist: normalizedDegrees(row.rotationDegrees - baseAngle),
    entryAngle: Math.abs(tangentAngle(luff, entryPoint)),
    exitAngle: Math.abs(tangentAngle(exitPoint, leech)),
  }
}

export function surfaceRowProfile(row: SurfaceRow) {
  const luff = row.points[0]
  const leech = row.points.at(-1)
  if (!leech) throw new Error('A surface row requires a leech point')
  const chordVector = {
    x: leech.x - luff.x,
    y: leech.y - luff.y,
    z: leech.z - luff.z,
  }
  const chordLength = vectorLength(chordVector)
  const chordDirection = normalizeVector(chordVector)
  return row.points.map((point) => {
    const offset = {
      x: point.x - luff.x,
      y: point.y - luff.y,
      z: point.z - luff.z,
    }
    const along = dotVector(offset, chordDirection)
    const normalOffset = addVector(
      offset,
      scaleVector(chordDirection, -along),
    )
    return {
      u: along / chordLength,
      depth: vectorLength(normalOffset) / chordLength,
    }
  })
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
  const aftView = (AFT_VIEW_DEGREES * Math.PI) / 180
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
    x: point.y * Math.cos(aftView) + point.x * Math.sin(aftView),
    y: point.z,
  }
}
