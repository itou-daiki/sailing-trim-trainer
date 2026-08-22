import type { BoatClass } from './types'
import {
  projectCoordinate,
  SAIL_GEOMETRY_UNIT_MM,
  type ProjectionView,
} from './sailGeometry'

export type HullPoint = {
  id: string
  x: number
  y: number
  z: number
}

export type ProjectedHullPoint = HullPoint & { screenX: number; screenY: number }

export type HullStationSpecification = {
  fromAftMm: number
  halfBeamMm: number
  keelBelowSheerMm: number
  sheerRiseMm: number
}

export type HullSpecification = {
  reference: string
  lengthMm: number
  beamMm: number
  mastFromAftMm: number
  jibTackFromAftMm: number
  breakwaterFromAftMm: number
  stations: HullStationSpecification[]
  cockpit: Array<{ fromAftMm: number; halfWidthMm: number }>
}

export type HullGeometry = {
  boat: BoatClass
  sections: HullPoint[][]
  panels: HullPoint[][]
  deckOutline: HullPoint[]
  cockpitOutline: HullPoint[]
  centerline: HullPoint[]
  stationLines: HullPoint[][]
  mastBase: HullPoint
  jibTack: HullPoint
}

/**
 * Longitudinal hardpoints come from the current World Sailing class rules and
 * Building Specification plans. Half-breadths and sheer/keel curves are
 * digitized from the plan and profile views on those drawings. Coordinates are
 * deliberately kept as stations so every camera renders the same hull, rather
 * than a different decorative icon for each view.
 */
export const HULL_SPECIFICATIONS: Record<BoatClass, HullSpecification> = {
  '420': {
    reference: 'World Sailing Building Specification, Drawing 5, Issue J (2022)',
    lengthMm: 4200,
    beamMm: 1630,
    mastFromAftMm: 2900,
    jibTackFromAftMm: 4105,
    breakwaterFromAftMm: 2920,
    stations: [
      { fromAftMm: 0, halfBeamMm: 300, keelBelowSheerMm: 335, sheerRiseMm: 0 },
      { fromAftMm: 380, halfBeamMm: 475, keelBelowSheerMm: 365, sheerRiseMm: 8 },
      { fromAftMm: 780, halfBeamMm: 645, keelBelowSheerMm: 397, sheerRiseMm: 16 },
      { fromAftMm: 1180, halfBeamMm: 750, keelBelowSheerMm: 425, sheerRiseMm: 25 },
      { fromAftMm: 1580, halfBeamMm: 805, keelBelowSheerMm: 448, sheerRiseMm: 36 },
      { fromAftMm: 1980, halfBeamMm: 815, keelBelowSheerMm: 463, sheerRiseMm: 49 },
      { fromAftMm: 2380, halfBeamMm: 795, keelBelowSheerMm: 470, sheerRiseMm: 64 },
      { fromAftMm: 2780, halfBeamMm: 735, keelBelowSheerMm: 463, sheerRiseMm: 83 },
      { fromAftMm: 3180, halfBeamMm: 630, keelBelowSheerMm: 430, sheerRiseMm: 111 },
      { fromAftMm: 3580, halfBeamMm: 465, keelBelowSheerMm: 360, sheerRiseMm: 157 },
      { fromAftMm: 3980, halfBeamMm: 185, keelBelowSheerMm: 210, sheerRiseMm: 238 },
      { fromAftMm: 4200, halfBeamMm: 0, keelBelowSheerMm: 0, sheerRiseMm: 330 },
    ],
    cockpit: [
      { fromAftMm: 45, halfWidthMm: 300 },
      { fromAftMm: 600, halfWidthMm: 350 },
      { fromAftMm: 1450, halfWidthMm: 385 },
      { fromAftMm: 2510, halfWidthMm: 380 },
      { fromAftMm: 2840, halfWidthMm: 255 },
      { fromAftMm: 2920, halfWidthMm: 70 },
    ],
  },
  '470': {
    reference: 'World Sailing Building Specification Plan 470-003 (2023)',
    lengthMm: 4700,
    beamMm: 1700,
    mastFromAftMm: 3085,
    jibTackFromAftMm: 4630,
    breakwaterFromAftMm: 3250,
    stations: [
      { fromAftMm: 0, halfBeamMm: 350, keelBelowSheerMm: 350, sheerRiseMm: 0 },
      { fromAftMm: 500, halfBeamMm: 565, keelBelowSheerMm: 395, sheerRiseMm: 10 },
      { fromAftMm: 1000, halfBeamMm: 730, keelBelowSheerMm: 430, sheerRiseMm: 18 },
      { fromAftMm: 1500, halfBeamMm: 820, keelBelowSheerMm: 458, sheerRiseMm: 29 },
      { fromAftMm: 2000, halfBeamMm: 850, keelBelowSheerMm: 480, sheerRiseMm: 43 },
      { fromAftMm: 2500, halfBeamMm: 842, keelBelowSheerMm: 492, sheerRiseMm: 58 },
      { fromAftMm: 3000, halfBeamMm: 790, keelBelowSheerMm: 490, sheerRiseMm: 79 },
      { fromAftMm: 3500, halfBeamMm: 680, keelBelowSheerMm: 455, sheerRiseMm: 111 },
      { fromAftMm: 4000, halfBeamMm: 490, keelBelowSheerMm: 365, sheerRiseMm: 168 },
      { fromAftMm: 4500, halfBeamMm: 175, keelBelowSheerMm: 175, sheerRiseMm: 270 },
      { fromAftMm: 4700, halfBeamMm: 0, keelBelowSheerMm: 0, sheerRiseMm: 350 },
    ],
    cockpit: [
      { fromAftMm: 40, halfWidthMm: 290 },
      { fromAftMm: 600, halfWidthMm: 330 },
      { fromAftMm: 1500, halfWidthMm: 400 },
      { fromAftMm: 2000, halfWidthMm: 415 },
      { fromAftMm: 3000, halfWidthMm: 385 },
      { fromAftMm: 3175, halfWidthMm: 245 },
      { fromAftMm: 3250, halfWidthMm: 75 },
    ],
  },
}

const LATERAL_FACTORS = [-1, -0.72, -0.38, 0, 0.38, 0.72, 1]

function longitudinalX(specification: HullSpecification, fromAftMm: number) {
  return (specification.mastFromAftMm - fromAftMm) / SAIL_GEOMETRY_UNIT_MM
}

function sheerZ(station: HullStationSpecification) {
  return (-40 + station.sheerRiseMm) / SAIL_GEOMETRY_UNIT_MM
}

function interpolateStation(
  specification: HullSpecification,
  fromAftMm: number,
): HullStationSpecification {
  const stations = specification.stations
  const upperIndex = stations.findIndex((station) => station.fromAftMm >= fromAftMm)
  if (upperIndex <= 0) return stations[0]
  const lower = stations[upperIndex - 1]
  const upper = stations[upperIndex]
  const amount = (fromAftMm - lower.fromAftMm) / (upper.fromAftMm - lower.fromAftMm)
  const mix = (a: number, b: number) => a + (b - a) * amount
  return {
    fromAftMm,
    halfBeamMm: mix(lower.halfBeamMm, upper.halfBeamMm),
    keelBelowSheerMm: mix(lower.keelBelowSheerMm, upper.keelBelowSheerMm),
    sheerRiseMm: mix(lower.sheerRiseMm, upper.sheerRiseMm),
  }
}

function sectionPoint(
  boat: BoatClass,
  specification: HullSpecification,
  station: HullStationSpecification,
  lateralFactor: number,
  stationIndex: number,
  lateralIndex: number,
): HullPoint {
  const edgeZ = sheerZ(station)
  const keelDrop = station.keelBelowSheerMm / SAIL_GEOMETRY_UNIT_MM
  const bottomFactor = 1 - Math.pow(Math.abs(lateralFactor), 1.58)
  return {
    id: `${boat}:hull:${stationIndex}:${lateralIndex}`,
    x: longitudinalX(specification, station.fromAftMm),
    y: (station.halfBeamMm * lateralFactor) / SAIL_GEOMETRY_UNIT_MM,
    z: edgeZ - keelDrop * bottomFactor,
  }
}

export function buildHullGeometry(boat: BoatClass): HullGeometry {
  const specification = HULL_SPECIFICATIONS[boat]
  const sections = specification.stations.map((station, stationIndex) =>
    LATERAL_FACTORS.map((factor, lateralIndex) =>
      sectionPoint(boat, specification, station, factor, stationIndex, lateralIndex),
    ),
  )
  const panels = sections.slice(0, -1).flatMap((section, stationIndex) =>
    section.slice(0, -1).map((point, lateralIndex) => [
      point,
      section[lateralIndex + 1],
      sections[stationIndex + 1][lateralIndex + 1],
      sections[stationIndex + 1][lateralIndex],
    ]),
  )
  const port = sections.map((section) => section[0])
  const starboard = [...sections].reverse().map((section) => section.at(-1)!)
  const deckOutline = [...port, ...starboard, port[0]]
  const centerline = specification.stations.map((station, index) => ({
    id: `${boat}:deck-center:${index}`,
    x: longitudinalX(specification, station.fromAftMm),
    y: 0,
    z: sheerZ(station) + Math.min(55, station.halfBeamMm * 0.07) / SAIL_GEOMETRY_UNIT_MM,
  }))
  const cockpitPort = specification.cockpit.map((point, index) => {
    const station = interpolateStation(specification, point.fromAftMm)
    return {
      id: `${boat}:cockpit:p:${index}`,
      x: longitudinalX(specification, point.fromAftMm),
      y: -point.halfWidthMm / SAIL_GEOMETRY_UNIT_MM,
      z: sheerZ(station) + 8 / SAIL_GEOMETRY_UNIT_MM,
    }
  })
  const cockpitStarboard = [...specification.cockpit].reverse().map((point, index) => {
    const station = interpolateStation(specification, point.fromAftMm)
    return {
      id: `${boat}:cockpit:s:${index}`,
      x: longitudinalX(specification, point.fromAftMm),
      y: point.halfWidthMm / SAIL_GEOMETRY_UNIT_MM,
      z: sheerZ(station) + 8 / SAIL_GEOMETRY_UNIT_MM,
    }
  })
  const cockpitOutline = [...cockpitPort, ...cockpitStarboard, cockpitPort[0]]

  return {
    boat,
    sections,
    panels,
    deckOutline,
    cockpitOutline,
    centerline,
    stationLines: sections.slice(0, -1),
    mastBase: { id: `${boat}:mast-base`, x: 0, y: 0, z: -0.015 },
    jibTack: {
      id: `${boat}:jib-tack`,
      x: longitudinalX(specification, specification.jibTackFromAftMm),
      y: 0,
      z: 0.015,
    },
  }
}

export function projectHullPoint(point: HullPoint, view: ProjectionView): ProjectedHullPoint {
  const projected = projectCoordinate(point, view)
  return { ...point, screenX: projected.x, screenY: projected.y }
}

