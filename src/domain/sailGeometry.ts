import type {
  BoatClass,
  MastBendProfile,
  SailLevel,
  SailPair,
  SailSection,
  SailShape,
} from './types'
import { buildHullGeometry, HULL_SPECIFICATIONS } from './hullGeometry'
import {
  AFT_VIEW_DEGREES,
  BOOM_END_CAMERA_NEAR_MM,
  BOOM_END_CAMERA_OFFSET_MM,
  createBoomAftSailCamera,
  createBoomEndCamera,
  createSternObservationCamera,
  fitProjection,
  projectBoomEndCoordinate,
  projectCoordinate,
  SAIL_GEOMETRY_UNIT_MM,
  STERN_CAMERA_DISTANCE_IN_HULL_LENGTHS,
  STERN_CAMERA_EYE_ABOVE_TRANSOM_MM,
  SIDE_ELEVATION_DEGREES,
  SIDE_OBLIQUE_DEGREES,
  type BoomEndCamera,
  type BoomEndProjectedPoint,
  type CoordinateProjector,
  type ProjectionView,
} from './geometryProjection'

export {
  AFT_VIEW_DEGREES,
  BOOM_END_CAMERA_NEAR_MM,
  BOOM_END_CAMERA_OFFSET_MM,
  createBoomAftSailCamera,
  createBoomEndCamera,
  createSternObservationCamera,
  fitProjection,
  projectBoomEndCoordinate,
  projectCoordinate,
  SAIL_GEOMETRY_UNIT_MM,
  STERN_CAMERA_DISTANCE_IN_HULL_LENGTHS,
  STERN_CAMERA_EYE_ABOVE_TRANSOM_MM,
  SIDE_ELEVATION_DEGREES,
  SIDE_OBLIQUE_DEGREES,
}
export type {
  BoomEndCamera,
  BoomEndProjectedPoint,
  CoordinateProjector,
  ProjectionView,
}

export type SailKey = 'main' | 'jib'
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
  /** Exact maximum-camber point, independent of the display mesh sampling. */
  draftPeak: SurfacePoint
  points: SurfacePoint[]
}

export type SailSurface = {
  sail: SailKey
  rows: SurfaceRow[]
}

export type RigSurfaces = Record<SailKey, SailSurface>

export type BoomPoint = {
  id: string
  x: number
  y: number
  z: number
}

export type BoomGeometry = {
  faces: BoomPoint[][]
  limitMarkFaces: BoomPoint[][]
  centreline: [BoomPoint, BoomPoint]
  outerPointSection: BoomPoint[]
  outerPoint: BoomPoint
  tack: BoomPoint
  clew: BoomPoint
  outhaulEaseMm: number
  aftEnd: {
    center: BoomPoint
    outer: BoomPoint[]
    inner: BoomPoint[]
  }
}

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
  rows: Array<Omit<SurfaceRow, 'points' | 'draftPeak'> & {
    draftPeak: ProjectedPoint
    points: ProjectedPoint[]
  }>
}

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
    /** Length of boltrope sewn into the foot; not the tack-to-clew distance. */
    footBoltropeMm: number
    /** Representative cutback from the mast's aft face to the tack corner. */
    tackSetbackMm: number
    crossWidths: MainCrossWidth[]
    outline: SailOutlineStation[]
    battens: BattenStation[]
  }
  jib: {
    luffMm: number
    leechMm: number
    footMm: number
    topWidthMm: number
    outline: SailOutlineStation[]
    battens: BattenStation[]
  }
}

export type ClassBoomSpecification = {
  /** ERS outer point distance measured from the mast's aft face. */
  outerPointMm: number
  /** Representative legal section used by this learning model. */
  verticalMm: number
  transverseMm: number
  /** ERS minimum width of the contrasting outer limit mark. */
  limitMarkWidthMm: number
  /** Display assumption for the permitted aft end fitting beyond the outer point. */
  aftEndFittingMm: number
}

export type ClassMastSpecification = {
  /** Representative legal fore-and-aft section inside the class-rule range. */
  foreAftMm: number
  /** Representative legal transverse section inside the class-rule range. */
  transverseMm: number
  /** Height from the heel above which the production spar is represented as tapered. */
  taperStartMm: number
  /** Representative masthead section scale; manufacturer extrusions vary. */
  mastheadScale: number
}

export type MastPoint = {
  id: string
  x: number
  y: number
  z: number
}

export type MastGeometry = {
  sections: MastPoint[][]
  faces: MastPoint[][]
  bottom: MastPoint[]
  top: MastPoint[]
  centreline: MastPoint[]
}

export type ClassRigSpecification = {
  /** ERS lower point measured from the mast heel datum. */
  lowerPointHeightMm: number
  /** ERS halyard intersection height; this is a limit, not the sail's head corner. */
  headsailHoistHeightMm: number
  /** Maximum permitted unloaded mast-spar curvature. */
  mastCurvatureMm: number
  /** Sailmaker tuning range measured from a taut halyard at spreader height. */
  tuningPrebendRangeMm: readonly [number, number]
  /** Upper visual envelope for the smooth, loaded fore-and-aft bend model. */
  loadedBendMaxMm: number
  /** Standard tuning-guide distance from the upper black band to the transom. */
  tuningMastRakeMm: number
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
      footBoltropeMm: 1920,
      tackSetbackMm: 20,
      crossWidths: [
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
        { height: 1, chordRatio: 115 / 2380, luffRakeRatio: 0.167 },
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
      footBoltropeMm: 2200,
      tackSetbackMm: 10,
      crossWidths: [
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
        { height: 1, chordRatio: 140 / 2640, luffRakeRatio: 0.178 },
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

/**
 * The outer-point and section envelopes come from the current World Sailing
 * class rules. The rules do not prescribe one manufacturer's exact extrusion,
 * so the section values below are representative legal dimensions. Both rules
 * permit an aft end fitting; its 70 mm display length is an explicit modelling
 * allowance rather than a class-controlled measurement.
 */
export const CLASS_BOOM_SPECIFICATIONS: Record<BoatClass, ClassBoomSpecification> = {
  '420': {
    outerPointMm: 2400,
    verticalMm: 70,
    transverseMm: 55,
    limitMarkWidthMm: 10,
    aftEndFittingMm: 70,
  },
  '470': {
    outerPointMm: 2650,
    verticalMm: 63,
    transverseMm: 38,
    limitMarkWidthMm: 10,
    aftEndFittingMm: 70,
  },
}

/**
 * Representative aluminium spar sections inside the current class envelopes.
 * The class rules constrain overall fore-aft/transverse dimensions but do not
 * prescribe one manufacturer's extrusion profile, so the display uses the
 * midpoint of each permitted range as a twelve-sided elliptical section.
 */
export const CLASS_MAST_SPECIFICATIONS: Record<BoatClass, ClassMastSpecification> = {
  '420': {
    foreAftMm: 62.5,
    transverseMm: 60,
    taperStartMm: 4500,
    mastheadScale: 0.56,
  },
  '470': {
    foreAftMm: 70,
    transverseMm: 65,
    taperStartMm: 5010,
    mastheadScale: 0.52,
  },
}

/** Current World Sailing rig dimensions, all measured from the mast heel. */
export const CLASS_RIG_SPECIFICATIONS: Record<BoatClass, ClassRigSpecification> = {
  '420': {
    lowerPointHeightMm: 1160,
    headsailHoistHeightMm: 4520,
    mastCurvatureMm: 40,
    tuningPrebendRangeMm: [55, 75],
    loadedBendMaxMm: 100,
    tuningMastRakeMm: 6110,
  },
  '470': {
    lowerPointHeightMm: 1055,
    headsailHoistHeightMm: 4870,
    mastCurvatureMm: 40,
    tuningPrebendRangeMm: [40, 80],
    loadedBendMaxMm: 105,
    tuningMastRakeMm: 6700,
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

type MastReferenceFrame = {
  heel: Vector3
  lowerPoint: Vector3
  upperPoint: Vector3
  direction: Vector3
  aftNormal: Vector3
}

const mastRakeAngleCache: Partial<Record<BoatClass, number>> = {}
const mastReferenceFrameCache: Partial<Record<BoatClass, MastReferenceFrame>> = {}

function mastRakeDistanceAtAngle(boat: BoatClass, angle: number) {
  const hull = buildHullGeometry(boat)
  const hullSpecification = HULL_SPECIFICATIONS[boat]
  const sail = CLASS_SAIL_SPECIFICATIONS[boat].main
  const rig = CLASS_RIG_SPECIFICATIONS[boat]
  const direction = { x: Math.sin(angle), y: 0, z: Math.cos(angle) }
  const deckRise = hull.mastDeck.z - hull.mastBase.z
  const heel = {
    x: hull.mastDeck.x - Math.tan(angle) * deckRise,
    y: 0,
    z: hull.mastBase.z,
  }
  const upperPoint = addVector(
    heel,
    scaleVector(
      direction,
      (rig.lowerPointHeightMm + sail.luffMm) / SAIL_GEOMETRY_UNIT_MM,
    ),
  )
  const transom = {
    x: hullSpecification.mastFromAftMm / SAIL_GEOMETRY_UNIT_MM,
    y: 0,
    z: -40 / SAIL_GEOMETRY_UNIT_MM,
  }
  return Math.hypot(
    upperPoint.x - transom.x,
    upperPoint.z - transom.z,
  ) * SAIL_GEOMETRY_UNIT_MM
}

/**
 * Solves the guide's upper-black-band-to-transom measurement into a geometric
 * rake angle while keeping the spar passing through the class mast partner.
 */
export function mastRakeAngleDegrees(boat: BoatClass) {
  const cached = mastRakeAngleCache[boat]
  if (cached !== undefined) return cached
  const target = CLASS_RIG_SPECIFICATIONS[boat].tuningMastRakeMm
  let lower = 0
  let upper = 15 * Math.PI / 180
  for (let iteration = 0; iteration < 60; iteration += 1) {
    const middle = (lower + upper) / 2
    if (mastRakeDistanceAtAngle(boat, middle) > target) lower = middle
    else upper = middle
  }
  const angle = ((lower + upper) / 2) * 180 / Math.PI
  mastRakeAngleCache[boat] = angle
  return angle
}

function mastReferenceFrame(boat: BoatClass): MastReferenceFrame {
  const cached = mastReferenceFrameCache[boat]
  if (cached) return cached
  const hull = buildHullGeometry(boat)
  const sail = CLASS_SAIL_SPECIFICATIONS[boat].main
  const rig = CLASS_RIG_SPECIFICATIONS[boat]
  const angle = mastRakeAngleDegrees(boat) * Math.PI / 180
  const direction = { x: Math.sin(angle), y: 0, z: Math.cos(angle) }
  const aftNormal = { x: Math.cos(angle), y: 0, z: -Math.sin(angle) }
  const deckRise = hull.mastDeck.z - hull.mastBase.z
  const heel = {
    x: hull.mastDeck.x - Math.tan(angle) * deckRise,
    y: 0,
    z: hull.mastBase.z,
  }
  const lowerPoint = addVector(
    heel,
    scaleVector(direction, rig.lowerPointHeightMm / SAIL_GEOMETRY_UNIT_MM),
  )
  const upperPoint = addVector(
    lowerPoint,
    scaleVector(direction, sail.luffMm / SAIL_GEOMETRY_UNIT_MM),
  )
  const frame = { heel, lowerPoint, upperPoint, direction, aftNormal }
  mastReferenceFrameCache[boat] = frame
  return frame
}

export function camberAt(u: number, depth: number, position: number) {
  const peak = clamp(position, 0.05, 0.95)
  if (u <= peak) {
    return Math.sin((u / peak) * (Math.PI / 2)) * depth
  }
  return Math.sin(((1 - u) / (1 - peak)) * (Math.PI / 2)) * depth
}

function mastAxisPoint(
  boat: BoatClass,
  height: number,
  mastBend: number,
  mastBendProfile?: MastBendProfile,
): Vector3 {
  const specification = CLASS_SAIL_SPECIFICATIONS[boat]
  const frame = mastReferenceFrame(boat)
  const h = clamp(height, 0, 1)
  const loadedBend = mastBendAtHeightMillimeters(
    boat,
    mastBend,
    mastBendProfile,
    h,
  ) / SAIL_GEOMETRY_UNIT_MM
  const rakePoint = addVector(
    frame.lowerPoint,
    scaleVector(
      frame.direction,
      h * specification.main.luffMm / SAIL_GEOMETRY_UNIT_MM,
    ),
  )
  // Prebend moves the spar's middle towards the bow, normal to the raked axis.
  return addVector(rakePoint, scaleVector(frame.aftNormal, -loadedBend))
}

/**
 * Converts the trim model's normalized bend signal to a class-specific loaded
 * bend estimate. The low end is the sailmaker prebend baseline; the upper end
 * includes the extra sailing load from vang/chock or fore/aft pullers.
 */
export function mastBendMillimeters(boat: BoatClass, mastBend: number) {
  const rig = CLASS_RIG_SPECIFICATIONS[boat]
  if (mastBend <= 0) return 0
  const normalized = clamp((mastBend - 0.012) / (0.078 - 0.012), 0, 1)
  return lerp(rig.tuningPrebendRangeMm[0], rig.loadedBendMaxMm, normalized)
}

const DEFAULT_MAST_PROFILE: MastBendProfile = {
  lower: 0.7,
  middle: 1,
  upper: 0.72,
}

export function mastBendProfileMillimeters(
  boat: BoatClass,
  mastBend: number,
  profile: MastBendProfile = DEFAULT_MAST_PROFILE,
): MastBendProfile {
  const maximumMillimeters = mastBendMillimeters(boat, mastBend)
  const maximumSignal = Math.max(profile.lower, profile.middle, profile.upper, 1e-9)
  return {
    lower: maximumMillimeters * profile.lower / maximumSignal,
    middle: maximumMillimeters * profile.middle / maximumSignal,
    upper: maximumMillimeters * profile.upper / maximumSignal,
  }
}

function clampedShapePreservingSpline(values: number[], height: number) {
  const intervalCount = values.length - 1
  const step = 1 / intervalCount
  const secants = values.slice(0, -1).map((value, index) =>
    (values[index + 1] - value) / step)
  const slopes = values.map((_, index) => {
    if (index === 0 || index === intervalCount) return 0
    const previous = secants[index - 1]
    const next = secants[index]
    if (previous === 0 || next === 0 || previous * next < 0) return 0
    return (2 * previous * next) / (previous + next)
  })
  const h = clamp(height, 0, 1)
  const scaled = h * intervalCount
  const index = Math.min(intervalCount - 1, Math.floor(scaled))
  const amount = scaled - index
  const amount2 = amount * amount
  const amount3 = amount2 * amount
  const h00 = 2 * amount3 - 3 * amount2 + 1
  const h10 = amount3 - 2 * amount2 + amount
  const h01 = -2 * amount3 + 3 * amount2
  const h11 = amount3 - amount2
  return h00 * values[index] +
    h10 * step * slopes[index] +
    h01 * values[index + 1] +
    h11 * step * slopes[index + 1]
}

/**
 * Interpolates a C1-continuous, non-overshooting spar curve through the three
 * teaching stations. Zero endpoint slopes avoid a visual hinge at either
 * black band. The apex follows the class/control profile without growing a
 * separate hook in the unsupported upper section.
 */
export function mastBendAtHeightMillimeters(
  boat: BoatClass,
  mastBend: number,
  profile: MastBendProfile | undefined,
  height: number,
) {
  if (mastBend <= 0) return 0
  if (height <= 0 || height >= 1) return 0
  const stations = mastBendProfileMillimeters(
    boat,
    mastBend,
    profile ?? DEFAULT_MAST_PROFILE,
  )
  const values = [0, stations.lower, stations.middle, stations.upper, 0]
  const interpolated = clampedShapePreservingSpline(values, height)
  return clamp(interpolated, 0, mastBendMillimeters(boat, mastBend))
}

function mastAftNormalAtHeight(
  boat: BoatClass,
  height: number,
  mastBend: number,
  mastBendProfile?: MastBendProfile,
) {
  const delta = 0.002
  const lower = mastAxisPoint(
    boat,
    Math.max(0, height - delta),
    mastBend,
    mastBendProfile,
  )
  const upper = mastAxisPoint(
    boat,
    Math.min(1, height + delta),
    mastBend,
    mastBendProfile,
  )
  const tangent = normalizeVector({
    x: upper.x - lower.x,
    y: upper.y - lower.y,
    z: upper.z - lower.z,
  })
  return normalizeVector({ x: tangent.z, y: 0, z: -tangent.x })
}

function mastSectionScale(boat: BoatClass, heightFromHeelMm: number) {
  const section = CLASS_MAST_SPECIFICATIONS[boat]
  const rig = CLASS_RIG_SPECIFICATIONS[boat]
  const upperPointHeightMm =
    rig.lowerPointHeightMm + CLASS_SAIL_SPECIFICATIONS[boat].main.luffMm
  const taper = clamp(
    (heightFromHeelMm - section.taperStartMm) /
      Math.max(1, upperPointHeightMm - section.taperStartMm),
    0,
    1,
  )
  const eased = taper * taper * (3 - 2 * taper)
  return lerp(1, section.mastheadScale, eased)
}

function mainLuffPoint(
  boat: BoatClass,
  height: number,
  mastBend: number,
  mastBendProfile?: MastBendProfile,
): Vector3 {
  const axis = mastAxisPoint(boat, height, mastBend, mastBendProfile)
  const aftNormal = mastAftNormalAtHeight(
    boat,
    height,
    mastBend,
    mastBendProfile,
  )
  const rig = CLASS_RIG_SPECIFICATIONS[boat]
  const sectionScale = mastSectionScale(
    boat,
    rig.lowerPointHeightMm + clamp(height, 0, 1) *
      CLASS_SAIL_SPECIFICATIONS[boat].main.luffMm,
  )
  const mastTrackOffset =
    CLASS_MAST_SPECIFICATIONS[boat].foreAftMm * sectionScale /
    2 / SAIL_GEOMETRY_UNIT_MM
  // The luff follows the groove on the local aft face of the curved spar.
  return addVector(axis, scaleVector(aftNormal, mastTrackOffset))
}

export type RigHardpoints = {
  mastHeel: Vector3
  mainTack: Vector3
  mainHead: Vector3
  stemhead: Vector3
  jibTack: Vector3
  jibHead: Vector3
  jibHalyardHoist: Vector3
}

/**
 * Mounting points for both sails in the shared hull coordinate system.
 * ERS defines headsail hoist height at the halyard/mast intersection, not at
 * the sail head. The jib tack therefore stays on the deck fitting and the
 * class-rule luff runs toward that upper halyard point without being stretched
 * up to it. This also preserves the guide baseline where the low jib foot is at
 * the deck/waterbreak instead of floating hundreds of millimetres above it.
 */
export function buildRigHardpoints(
  boat: BoatClass,
  mastBend = 0,
  mastBendProfile?: MastBendProfile,
): RigHardpoints {
  const hull = buildHullGeometry(boat)
  const sails = CLASS_SAIL_SPECIFICATIONS[boat]
  const rig = CLASS_RIG_SPECIFICATIONS[boat]
  const mainTack = mainLuffPoint(boat, 0, mastBend, mastBendProfile)
  const mainHead = mainLuffPoint(boat, 1, mastBend, mastBendProfile)
  const halyardHoistFraction =
    (rig.headsailHoistHeightMm - rig.lowerPointHeightMm) /
    sails.main.luffMm
  const halyardHoistPoint = mainLuffPoint(
    boat,
    halyardHoistFraction,
    mastBend,
    mastBendProfile,
  )
  const jibTack = {
    x: hull.jibTack.x,
    y: hull.jibTack.y,
    z: hull.jibTack.z,
  }
  const luffLength = sails.jib.luffMm / SAIL_GEOMETRY_UNIT_MM
  const jibLuffDirection = normalizeVector({
    x: halyardHoistPoint.x - jibTack.x,
    y: halyardHoistPoint.y - jibTack.y,
    z: halyardHoistPoint.z - jibTack.z,
  })
  const jibHead = {
    ...addVector(jibTack, scaleVector(jibLuffDirection, luffLength)),
  }
  const frame = mastReferenceFrame(boat)

  return {
    mastHeel: frame.heel,
    mainTack,
    mainHead,
    stemhead: hull.jibTack,
    jibTack,
    jibHead,
    jibHalyardHoist: halyardHoistPoint,
  }
}

const MAST_SECTION_POINT_COUNT = 12

/**
 * Builds the visible mast above the deck as one closed 3D spar. Cross-sections
 * stay at class scale and follow the same live bend axis used by the mainsail;
 * the stepped portion below deck is omitted rather than exposing a line
 * through the hull.
 */
export function buildMastGeometry(
  boat: BoatClass,
  mastBend = 0,
  mastBendProfile?: MastBendProfile,
): MastGeometry {
  const hull = buildHullGeometry(boat)
  const sail = CLASS_SAIL_SPECIFICATIONS[boat].main
  const rig = CLASS_RIG_SPECIFICATIONS[boat]
  const section = CLASS_MAST_SPECIFICATIONS[boat]
  const frame = mastReferenceFrame(boat)
  const deckDistanceMm = vectorLength({
    x: hull.mastDeck.x - frame.heel.x,
    y: hull.mastDeck.y - frame.heel.y,
    z: hull.mastDeck.z - frame.heel.z,
  }) * SAIL_GEOMETRY_UNIT_MM
  const stationDistancesMm = [
    deckDistanceMm,
    rig.lowerPointHeightMm,
    ...ROW_HEIGHTS.slice(1).map(
      (height) => rig.lowerPointHeightMm + height * sail.luffMm,
    ),
  ]

  const centreline = stationDistancesMm.map((distanceMm, stationIndex): MastPoint => {
    if (distanceMm <= rig.lowerPointHeightMm) {
      const point = addVector(
        frame.heel,
        scaleVector(frame.direction, distanceMm / SAIL_GEOMETRY_UNIT_MM),
      )
      return {
        id: `${boat}:mast-axis:${stationIndex}`,
        ...point,
      }
    }

    const point = mastAxisPoint(
      boat,
      (distanceMm - rig.lowerPointHeightMm) / sail.luffMm,
      mastBend,
      mastBendProfile,
    )
    return {
      id: `${boat}:mast-axis:${stationIndex}`,
      ...point,
    }
  })

  const sections = centreline.map((axis, stationIndex) => {
    const previous = centreline[Math.max(0, stationIndex - 1)]
    const next = centreline[Math.min(centreline.length - 1, stationIndex + 1)]
    const tangent = normalizeVector({
      x: next.x - previous.x,
      y: next.y - previous.y,
      z: next.z - previous.z,
    })
    const aftNormal = normalizeVector({ x: tangent.z, y: 0, z: -tangent.x })
    const transverseNormal = { x: 0, y: 1, z: 0 }
    const sectionScale = mastSectionScale(boat, stationDistancesMm[stationIndex])
    const foreAftRadius = section.foreAftMm * sectionScale /
      SAIL_GEOMETRY_UNIT_MM / 2
    const transverseRadius = section.transverseMm * sectionScale /
      SAIL_GEOMETRY_UNIT_MM / 2
    return Array.from(
      { length: MAST_SECTION_POINT_COUNT },
      (_, pointIndex): MastPoint => {
      const angle = (pointIndex / MAST_SECTION_POINT_COUNT) * Math.PI * 2
      const point = addVector(
        addVector(
          axis,
          scaleVector(aftNormal, Math.cos(angle) * foreAftRadius),
        ),
        scaleVector(transverseNormal, Math.sin(angle) * transverseRadius),
      )
      return {
        id: `${boat}:mast:${stationIndex}:${pointIndex}`,
        ...point,
      }
    })
  })
  const faces = sections.slice(0, -1).flatMap((lower, stationIndex) =>
    lower.map((point, pointIndex) => {
      const nextPointIndex = (pointIndex + 1) % MAST_SECTION_POINT_COUNT
      return [
        point,
        lower[nextPointIndex],
        sections[stationIndex + 1][nextPointIndex],
        sections[stationIndex + 1][pointIndex],
      ]
    }),
  )

  return {
    sections,
    faces,
    bottom: [...sections[0]].reverse(),
    top: sections.at(-1)!,
    centreline,
  }
}

function planform(
  boat: BoatClass,
  sail: SailKey,
  height: number,
  mastBend: number,
  mastBendProfile: MastBendProfile | undefined,
  rotation: number,
  footEaseMm: number,
) {
  const specification = CLASS_SAIL_SPECIFICATIONS[boat]
  if (sail === 'main') {
    const outline = stationAtHeight(specification.main.outline, height)
    const chordDirection = { x: Math.cos(rotation), y: Math.sin(rotation), z: 0 }
    const tackCutback = specification.main.tackSetbackMm *
      (1 - clamp(height / 0.0625, 0, 1))
    const referenceFootMm =
      CLASS_BOOM_SPECIFICATIONS[boat].outerPointMm - specification.main.tackSetbackMm
    const lowerFootInfluence = (1 - height) ** 3
    const chordMm = Math.max(
      1,
      referenceFootMm * outline.chordRatio - footEaseMm * lowerFootInfluence,
    )
    return {
      luff: addVector(
        mainLuffPoint(boat, height, mastBend, mastBendProfile),
        scaleVector(chordDirection, tackCutback / SAIL_GEOMETRY_UNIT_MM),
      ),
      chord: chordMm / SAIL_GEOMETRY_UNIT_MM,
      chordDirection,
      normalDirection: { x: -chordDirection.y, y: chordDirection.x, z: 0 },
    }
  }

  const jib = specification.jib
  const triangle = jibTriangle(jib)
  const outline = stationAtHeight(jib.outline, height)
  const hardpoints = buildRigHardpoints(boat, mastBend, mastBendProfile)
  const tack = hardpoints.jibTack
  const head = hardpoints.jibHead
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
  rigMastBendProfile = shape.mastBendProfile,
): SailSurface {
  const battens = CLASS_SAIL_SPECIFICATIONS[boat][sail].battens
  const rowHeights = [...new Set([
    ...ROW_HEIGHTS,
    ...battens.map((batten) => batten.height),
  ])].sort((a, b) => a - b)
  const rows = rowHeights.map((height, rowIndex): SurfaceRow => {
    const section = sectionAtHeight(shape, height)
    const angle = ((shape.angle + section.twist) * Math.PI) / 180
    const rig = planform(
      boat,
      sail,
      height,
      rigMastBend,
      rigMastBendProfile,
      angle,
      shape.footEaseMm,
    )
    const level = (Object.entries(LEVEL_HEIGHTS) as Array<[SailLevel, number]>)
      .find(([, levelHeight]) => levelHeight === height)?.[0]
    const battenStartU = battens.find(
      (batten) => Math.abs(batten.height - height) < 1e-9,
    )?.startU

    const pointAt = (u: number, column: number, idSuffix = String(column)): SurfacePoint => {
      // The 420 / 470 mainsail foot is displayed as attached to the boom.
      // Draft starts immediately above it; applying section camber to this
      // lowest row would make the middle of the foot float beside the boom
      // even though its tack and clew remain connected.
      const footAttachedToBoom = sail === 'main' && height === 0
      const camber = footAttachedToBoom
        ? 0
        : camberAt(u, section.draftDepth, section.draftPosition) * rig.chord
      return {
        id: `${sail}:${rowIndex}:${idSuffix}`,
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
    }
    const points = Array.from({ length: POINT_COUNT }, (_, column) =>
      pointAt(column / (POINT_COUNT - 1), column))
    const draftPeak = pointAt(section.draftPosition, -1, 'draft-peak')

    return {
      height,
      level,
      battenStartU,
      rotationDegrees: shape.angle + section.twist,
      section,
      draftPeak,
      points,
    }
  })

  return { sail, rows }
}

export function buildRigSurfaces(boat: BoatClass, pair: SailPair): RigSurfaces {
  return {
    main: buildSailSurface(
      boat,
      'main',
      pair.main,
      pair.main.mastBend,
      pair.main.mastBendProfile,
    ),
    jib: buildSailSurface(
      boat,
      'jib',
      pair.jib,
      pair.main.mastBend,
      pair.main.mastBendProfile,
    ),
  }
}

function boomSection(
  id: string,
  center: Vector3,
  transverse: Vector3,
  halfWidth: number,
  halfHeight: number,
): BoomPoint[] {
  const corner = (name: string, widthSign: number, heightSign: number): BoomPoint => ({
    id: `${id}:${name}`,
    x: center.x + transverse.x * halfWidth * widthSign,
    y: center.y + transverse.y * halfWidth * widthSign,
    z: center.z + halfHeight * heightSign,
  })
  return [
    corner('upper-port', 1, 1),
    corner('upper-starboard', -1, 1),
    corner('lower-starboard', -1, -1),
    corner('lower-port', 1, -1),
  ]
}

/**
 * Builds one boom prism from the live mainsail foot. The sail foot sits on the
 * top of the section, so the same live sheet angle turns the boom and sail.
 */
export function buildBoomGeometry(
  boat: BoatClass,
  main: SailSurface,
): BoomGeometry {
  if (main.sail !== 'main') throw new Error('Boom geometry requires a mainsail surface')
  const foot = main.rows[0]?.points
  const luff = foot?.[0]
  const clew = foot?.at(-1)
  if (!luff || !clew) throw new Error('Boom geometry requires a complete mainsail foot')

  const specification = CLASS_BOOM_SPECIFICATIONS[boat]
  const direction = normalizeVector({
    x: clew.x - luff.x,
    y: clew.y - luff.y,
    z: 0,
  })
  const transverse = { x: -direction.y, y: direction.x, z: 0 }
  const halfWidth = specification.transverseMm / SAIL_GEOMETRY_UNIT_MM / 2
  const halfHeight = specification.verticalMm / SAIL_GEOMETRY_UNIT_MM / 2
  const tackSetback =
    CLASS_SAIL_SPECIFICATIONS[boat].main.tackSetbackMm / SAIL_GEOMETRY_UNIT_MM
  const startCenter = {
    x: luff.x - direction.x * tackSetback,
    y: luff.y - direction.y * tackSetback,
    z: luff.z - halfHeight,
  }
  const outerPointCenter = addVector(
    startCenter,
    scaleVector(direction, specification.outerPointMm / SAIL_GEOMETRY_UNIT_MM),
  )
  const endCenter = addVector(
    outerPointCenter,
    scaleVector(direction, specification.aftEndFittingMm / SAIL_GEOMETRY_UNIT_MM),
  )
  const start = boomSection(`${boat}:boom:start`, startCenter, transverse, halfWidth, halfHeight)
  const end = boomSection(`${boat}:boom:end`, endCenter, transverse, halfWidth, halfHeight)
  const outerPointSection = boomSection(
    `${boat}:boom:outer-point`,
    outerPointCenter,
    transverse,
    halfWidth,
    halfHeight,
  )
  const limitMarkAftCenter = addVector(
    outerPointCenter,
    scaleVector(direction, specification.limitMarkWidthMm / SAIL_GEOMETRY_UNIT_MM),
  )
  const limitMarkAftSection = boomSection(
    `${boat}:boom:limit-mark:aft`,
    limitMarkAftCenter,
    transverse,
    halfWidth,
    halfHeight,
  )
  const inner = boomSection(
    `${boat}:boom:end-opening`,
    endCenter,
    transverse,
    halfWidth * 0.56,
    halfHeight * 0.56,
  )
  const point = (id: string, vector: Vector3): BoomPoint => ({ id, ...vector })
  const outerPoint = point(`${boat}:boom:outer-point`, {
    ...outerPointCenter,
    z: outerPointCenter.z + halfHeight,
  })
  const tack = point(`${boat}:boom:tack`, luff)
  const clewPoint = point(`${boat}:boom:clew`, clew)
  const outhaulEaseMm = Math.max(0, dotVector({
    x: outerPoint.x - clewPoint.x,
    y: outerPoint.y - clewPoint.y,
    z: 0,
  }, direction) * SAIL_GEOMETRY_UNIT_MM)

  return {
    faces: start.map((corner, index) => [
      corner,
      end[index],
      end[(index + 1) % end.length],
      start[(index + 1) % start.length],
    ]),
    limitMarkFaces: outerPointSection.map((corner, index) => [
      corner,
      limitMarkAftSection[index],
      limitMarkAftSection[(index + 1) % limitMarkAftSection.length],
      outerPointSection[(index + 1) % outerPointSection.length],
    ]),
    centreline: [
      point(`${boat}:boom:center:start`, startCenter),
      point(`${boat}:boom:center:end`, endCenter),
    ],
    outerPointSection,
    outerPoint,
    tack,
    clew: clewPoint,
    outhaulEaseMm,
    aftEnd: {
      center: point(`${boat}:boom:end:center`, endCenter),
      outer: end,
      inner,
    },
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

  const peakOffset = {
    x: row.draftPeak.x - luff.x,
    y: row.draftPeak.y - luff.y,
    z: row.draftPeak.z - luff.z,
  }
  const peakAlong = dotVector(peakOffset, chordDirection)
  const peakNormalOffset = addVector(
    peakOffset,
    scaleVector(chordDirection, -peakAlong),
  )
  const maxDepth = vectorLength(peakNormalOffset)
  const draftPosition = peakAlong / chordLength

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
  return [...row.points, row.draftPeak]
    .sort((a, b) => a.u - b.u)
    .map((point) => {
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
  aftAzimuthDegrees = AFT_VIEW_DEGREES,
  coordinateProjector?: CoordinateProjector,
): ProjectedSurface {
  const project = coordinateProjector ?? ((point) =>
    projectCoordinate(point, view, aftAzimuthDegrees))
  return {
    sail: surface.sail,
    view,
    rows: surface.rows.map((row) => ({
      ...row,
      draftPeak: {
        ...row.draftPeak,
        ...project(row.draftPeak),
      },
      points: row.points.map((point): ProjectedPoint => ({
        ...point,
        ...project(point),
      })),
    })),
  }
}
