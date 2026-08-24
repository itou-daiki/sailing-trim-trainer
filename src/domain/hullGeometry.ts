import type { BoatClass } from './types'
import {
  projectCoordinate,
  SAIL_GEOMETRY_UNIT_MM,
  type ProjectionView,
} from './geometryProjection'

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

type CaseSpecification = {
  aftFromAftMm: number
  forwardFromAftMm: number
  halfWidthMm: number
  heightMm: number
}

type ThwartSpecification = {
  fromAftMm: number
  foreAftMm: number
  thicknessMm: number
}

export type HullSpecification = {
  reference: string
  referenceUrl: string
  lengthMm: number
  beamMm: number
  mastFromAftMm: number
  jibTackFromAftMm: number
  mainsheetTrackFromAftMm: number
  keelsonHeightMm: number
  deckCrownMm: number
  gunwaleWidthMm: number
  breakwaterFromAftMm: number
  breakwaterHeightMm: number
  breakwaterHalfSpanFactor: number
  breakwaterSweepMm: number
  cockpitFloorAboveKeelMm: number
  centerboardCase: CaseSpecification
  thwart: ThwartSpecification
  stations: HullStationSpecification[]
  cockpit: Array<{ fromAftMm: number; halfWidthMm: number }>
}

export type HullGeometry = {
  boat: BoatClass
  /** Transverse hull-shell sections, from the transom to the stem. */
  sections: HullPoint[][]
  /** Fair hull-shell quadrilaterals. Retained as `panels` for API continuity. */
  panels: HullPoint[][]
  transomFaces: HullPoint[][]
  deckFaces: HullPoint[][]
  cockpitWallFaces: HullPoint[][]
  cockpitFloorFaces: HullPoint[][]
  centerboardCaseFaces: HullPoint[][]
  thwartFaces: HullPoint[][]
  breakwaterFaces: HullPoint[][]
  deckOutline: HullPoint[]
  cockpitOutline: HullPoint[]
  cockpitFloorOutline: HullPoint[]
  centerline: HullPoint[]
  stationLines: HullPoint[][]
  gunwaleLines: HullPoint[][]
  centerboardCaseOutline: HullPoint[]
  mainsheetTrack: HullPoint[]
  allPoints: HullPoint[]
  /** Mast heel on the mast-step bearing surface. */
  mastBase: HullPoint
  /** Visible mast entry point on the foredeck centreline. */
  mastDeck: HullPoint
  /** Deck fitting below the adjustable jib tack. */
  jibTack: HullPoint
}

/**
 * Sources (public class construction drawings):
 * 420: https://media.sailing.org/sailing/wp-content/uploads/2022/07/02133245/420_BuildingSpec_2022-09Sep-01.pdf
 * 470: https://media.sailing.org/sailing/wp-content/uploads/2023/01/19160058/470_005_080623_GA.pdf
 *
 * The drawings constrain the main envelope and construction arrangement, but
 * do not publish a production mould/CAD surface. The longitudinal sections are
 * therefore a representative interpolation of the published plan/profile
 * envelope. Construction items with published limits are kept as separate 3D
 * parts so the learner sees a dinghy, not one filled hull silhouette.
 */
export const HULL_SPECIFICATIONS: Record<BoatClass, HullSpecification> = {
  '420': {
    reference: 'World Sailing Building Specification, Drawing 5, Issue J (2022)',
    referenceUrl: 'https://media.sailing.org/sailing/wp-content/uploads/2022/07/02133245/420_BuildingSpec_2022-09Sep-01.pdf',
    lengthMm: 4200,
    beamMm: 1630,
    mastFromAftMm: 2900,
    jibTackFromAftMm: 4105,
    mainsheetTrackFromAftMm: 1450,
    keelsonHeightMm: 45,
    deckCrownMm: 30,
    gunwaleWidthMm: 30,
    breakwaterFromAftMm: 2920,
    breakwaterHeightMm: 30,
    breakwaterHalfSpanFactor: 0.78,
    breakwaterSweepMm: 250,
    cockpitFloorAboveKeelMm: 105,
    centerboardCase: {
      aftFromAftMm: 1415,
      forwardFromAftMm: 2795,
      halfWidthMm: 85,
      heightMm: 295,
    },
    thwart: { fromAftMm: 2070, foreAftMm: 160, thicknessMm: 42 },
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
      { fromAftMm: 45, halfWidthMm: 260 },
      { fromAftMm: 600, halfWidthMm: 350 },
      { fromAftMm: 1450, halfWidthMm: 385 },
      { fromAftMm: 2510, halfWidthMm: 380 },
      { fromAftMm: 2800, halfWidthMm: 250 },
      { fromAftMm: 2920, halfWidthMm: 85 },
    ],
  },
  '470': {
    reference: 'World Sailing Building Specification Plan 470-003 (2023)',
    referenceUrl: 'https://media.sailing.org/sailing/wp-content/uploads/2023/01/19160058/470_005_080623_GA.pdf',
    lengthMm: 4700,
    beamMm: 1700,
    mastFromAftMm: 3085,
    jibTackFromAftMm: 4630,
    mainsheetTrackFromAftMm: 1630,
    keelsonHeightMm: 45,
    deckCrownMm: 32,
    gunwaleWidthMm: 30,
    breakwaterFromAftMm: 3250,
    breakwaterHeightMm: 40,
    breakwaterHalfSpanFactor: 0.76,
    breakwaterSweepMm: 230,
    cockpitFloorAboveKeelMm: 115,
    centerboardCase: {
      aftFromAftMm: 1580,
      forwardFromAftMm: 3005,
      halfWidthMm: 100,
      heightMm: 315,
    },
    thwart: { fromAftMm: 2400, foreAftMm: 150, thicknessMm: 42 },
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
      { fromAftMm: 2400, halfWidthMm: 415 },
      { fromAftMm: 3000, halfWidthMm: 385 },
      { fromAftMm: 3175, halfWidthMm: 245 },
      { fromAftMm: 3250, halfWidthMm: 85 },
    ],
  },
}

const LATERAL_FACTORS = [-1, -0.78, -0.52, -0.27, 0, 0.27, 0.52, 0.78, 1]

function longitudinalX(specification: HullSpecification, fromAftMm: number) {
  return (specification.mastFromAftMm - fromAftMm) / SAIL_GEOMETRY_UNIT_MM
}

function sheerZ(station: HullStationSpecification) {
  return (-40 + station.sheerRiseMm) / SAIL_GEOMETRY_UNIT_MM
}

function mix(a: number, b: number, amount: number) {
  return a + (b - a) * amount
}

function interpolateStation(
  specification: HullSpecification,
  fromAftMm: number,
): HullStationSpecification {
  const stations = specification.stations
  const upperIndex = stations.findIndex((station) => station.fromAftMm >= fromAftMm)
  if (upperIndex <= 0) return { ...stations[0], fromAftMm }
  if (upperIndex === -1) return { ...stations.at(-1)!, fromAftMm }
  const lower = stations[upperIndex - 1]
  const upper = stations[upperIndex]
  const amount = (fromAftMm - lower.fromAftMm) / (upper.fromAftMm - lower.fromAftMm)
  return {
    fromAftMm,
    halfBeamMm: mix(lower.halfBeamMm, upper.halfBeamMm, amount),
    keelBelowSheerMm: mix(lower.keelBelowSheerMm, upper.keelBelowSheerMm, amount),
    sheerRiseMm: mix(lower.sheerRiseMm, upper.sheerRiseMm, amount),
  }
}

function interpolateCockpitHalfWidth(
  specification: HullSpecification,
  fromAftMm: number,
) {
  const points = specification.cockpit
  const upperIndex = points.findIndex((point) => point.fromAftMm >= fromAftMm)
  if (upperIndex <= 0) return points[0].halfWidthMm
  if (upperIndex === -1) return points.at(-1)!.halfWidthMm
  const lower = points[upperIndex - 1]
  const upper = points[upperIndex]
  const amount = (fromAftMm - lower.fromAftMm) / (upper.fromAftMm - lower.fromAftMm)
  return mix(lower.halfWidthMm, upper.halfWidthMm, amount)
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
  const absoluteFactor = Math.abs(lateralFactor)
  // Rounded bilge with a firmer centre run; not manufacturer mould geometry.
  const bottomFactor = Math.pow(1 - Math.pow(absoluteFactor, 1.72), 0.82)
  return {
    id: `${boat}:shell:${stationIndex}:${lateralIndex}`,
    x: longitudinalX(specification, station.fromAftMm),
    y: (station.halfBeamMm * lateralFactor) / SAIL_GEOMETRY_UNIT_MM,
    z: edgeZ - keelDrop * bottomFactor,
  }
}

function deckPoint(
  boat: BoatClass,
  specification: HullSpecification,
  fromAftMm: number,
  lateralMm: number,
  id: string,
): HullPoint {
  const station = interpolateStation(specification, fromAftMm)
  const halfBeam = Math.max(1, station.halfBeamMm)
  const clampedLateral = Math.max(-halfBeam, Math.min(halfBeam, lateralMm))
  const lateralFactor = Math.abs(clampedLateral) / halfBeam
  const crownScale = Math.min(1, station.halfBeamMm / 300)
  const crown = specification.deckCrownMm * crownScale *
    (1 - Math.pow(lateralFactor, 1.65))
  return {
    id: `${boat}:${id}`,
    x: longitudinalX(specification, fromAftMm),
    y: clampedLateral / SAIL_GEOMETRY_UNIT_MM,
    z: sheerZ(station) + crown / SAIL_GEOMETRY_UNIT_MM,
  }
}

function floorSection(
  boat: BoatClass,
  specification: HullSpecification,
  fromAftMm: number,
  index: number,
) {
  const station = interpolateStation(specification, fromAftMm)
  const rimHalfWidth = Math.min(
    interpolateCockpitHalfWidth(specification, fromAftMm),
    Math.max(45, station.halfBeamMm - specification.gunwaleWidthMm),
  )
  const floorHalfWidth = Math.max(35, rimHalfWidth - 65)
  const shellKeelZ = sheerZ(station) - station.keelBelowSheerMm / SAIL_GEOMETRY_UNIT_MM
  const floorZ = Math.min(
    sheerZ(station) - 150 / SAIL_GEOMETRY_UNIT_MM,
    shellKeelZ + specification.cockpitFloorAboveKeelMm / SAIL_GEOMETRY_UNIT_MM,
  )
  return {
    port: {
      id: `${boat}:cockpit-floor:p:${index}`,
      x: longitudinalX(specification, fromAftMm),
      y: -floorHalfWidth / SAIL_GEOMETRY_UNIT_MM,
      z: floorZ,
    },
    starboard: {
      id: `${boat}:cockpit-floor:s:${index}`,
      x: longitudinalX(specification, fromAftMm),
      y: floorHalfWidth / SAIL_GEOMETRY_UNIT_MM,
      z: floorZ,
    },
  }
}

function boxFaces(corners: {
  aftPortBottom: HullPoint
  aftStarboardBottom: HullPoint
  aftPortTop: HullPoint
  aftStarboardTop: HullPoint
  forwardPortBottom: HullPoint
  forwardStarboardBottom: HullPoint
  forwardPortTop: HullPoint
  forwardStarboardTop: HullPoint
}) {
  return [
    [corners.aftPortTop, corners.forwardPortTop, corners.forwardStarboardTop, corners.aftStarboardTop],
    [corners.aftPortBottom, corners.aftPortTop, corners.aftStarboardTop, corners.aftStarboardBottom],
    [corners.forwardPortBottom, corners.forwardStarboardBottom, corners.forwardStarboardTop, corners.forwardPortTop],
    [corners.aftPortBottom, corners.forwardPortBottom, corners.forwardPortTop, corners.aftPortTop],
    [corners.aftStarboardBottom, corners.aftStarboardTop, corners.forwardStarboardTop, corners.forwardStarboardBottom],
  ]
}

function uniqueSorted(values: number[]) {
  return [...new Set(values)].sort((a, b) => a - b)
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

  const portGunwale = sections.map((section) => section[0])
  const starboardGunwale = sections.map((section) => section.at(-1)!)
  const deckOutline = [...portGunwale, ...[...starboardGunwale].reverse(), portGunwale[0]]
  const transomFaces = [[...sections[0], sections[0][0]]]

  const cockpitEnd = specification.cockpit.at(-1)!.fromAftMm
  const deckSamples = uniqueSorted([
    ...specification.stations.map((station) => station.fromAftMm),
    ...specification.cockpit.map((point) => point.fromAftMm),
    cockpitEnd,
  ])
  const deckSections = deckSamples.map((fromAftMm, index) => {
    const station = interpolateStation(specification, fromAftMm)
    const outerHalfWidth = station.halfBeamMm
    const cockpitHalfWidth = Math.min(
      interpolateCockpitHalfWidth(specification, fromAftMm),
      Math.max(0, outerHalfWidth - specification.gunwaleWidthMm),
    )
    return {
      fromAftMm,
      port: deckPoint(boat, specification, fromAftMm, -outerHalfWidth, `deck:p:${index}`),
      starboard: deckPoint(boat, specification, fromAftMm, outerHalfWidth, `deck:s:${index}`),
      center: deckPoint(boat, specification, fromAftMm, 0, `deck:c:${index}`),
      cockpitPort: deckPoint(boat, specification, fromAftMm, -cockpitHalfWidth, `cockpit-rim:p:${index}`),
      cockpitStarboard: deckPoint(boat, specification, fromAftMm, cockpitHalfWidth, `cockpit-rim:s:${index}`),
    }
  })
  const deckFaces = deckSections.slice(0, -1).flatMap((section, index) => {
    const next = deckSections[index + 1]
    const midpoint = (section.fromAftMm + next.fromAftMm) / 2
    if (midpoint < cockpitEnd) {
      return [
        [section.port, next.port, next.cockpitPort, section.cockpitPort],
        [section.cockpitStarboard, next.cockpitStarboard, next.starboard, section.starboard],
      ]
    }
    return [
      [section.port, next.port, next.center, section.center],
      [section.center, next.center, next.starboard, section.starboard],
    ]
  })

  const cockpitControlPoints = [
    { fromAftMm: 0, halfWidthMm: specification.cockpit[0].halfWidthMm },
    ...specification.cockpit,
  ]
  const cockpitPort = cockpitControlPoints.map((point, index) =>
    deckPoint(boat, specification, point.fromAftMm, -point.halfWidthMm, `cockpit:p:${index}`),
  )
  const cockpitStarboard = [...cockpitControlPoints].reverse().map((point, index) =>
    deckPoint(boat, specification, point.fromAftMm, point.halfWidthMm, `cockpit:s:${index}`),
  )
  const cockpitOutline = [...cockpitPort, ...cockpitStarboard, cockpitPort[0]]

  const cockpitFloorSamples = uniqueSorted([
    0,
    ...specification.cockpit.map((point) => point.fromAftMm),
    specification.centerboardCase.aftFromAftMm,
    specification.centerboardCase.forwardFromAftMm,
    specification.thwart.fromAftMm,
  ])
  const floorSections = cockpitFloorSamples.map((fromAftMm, index) =>
    floorSection(boat, specification, fromAftMm, index),
  )
  const cockpitFloorFaces = floorSections.slice(0, -1).map((section, index) => [
    section.port,
    floorSections[index + 1].port,
    floorSections[index + 1].starboard,
    section.starboard,
  ])
  const floorPort = floorSections.map((section) => section.port)
  const floorStarboard = [...floorSections].reverse().map((section) => section.starboard)
  const cockpitFloorOutline = [...floorPort, ...floorStarboard, floorPort[0]]

  const cockpitRimSections = cockpitFloorSamples.map((fromAftMm, index) => {
    const halfWidth = interpolateCockpitHalfWidth(specification, fromAftMm)
    return {
      port: deckPoint(boat, specification, fromAftMm, -halfWidth, `cockpit-wall-rim:p:${index}`),
      starboard: deckPoint(boat, specification, fromAftMm, halfWidth, `cockpit-wall-rim:s:${index}`),
    }
  })
  const cockpitWallFaces = floorSections.slice(0, -1).flatMap((floor, index) => {
    const nextFloor = floorSections[index + 1]
    const rim = cockpitRimSections[index]
    const nextRim = cockpitRimSections[index + 1]
    return [
      [rim.port, nextRim.port, nextFloor.port, floor.port],
      [floor.starboard, nextFloor.starboard, nextRim.starboard, rim.starboard],
    ]
  })
  const forwardFloor = floorSections.at(-1)!
  const forwardRim = cockpitRimSections.at(-1)!
  cockpitWallFaces.push([
    forwardRim.port,
    forwardRim.starboard,
    forwardFloor.starboard,
    forwardFloor.port,
  ])

  const caseSpecification = specification.centerboardCase
  const caseSamples = [
    caseSpecification.aftFromAftMm,
    caseSpecification.aftFromAftMm + 90,
    caseSpecification.forwardFromAftMm - 110,
    caseSpecification.forwardFromAftMm,
  ]
  const caseWidthFactors = [0.58, 1, 1, 0.5]
  const caseSections = caseSamples.map((fromAftMm, index) => {
    const floor = floorSection(boat, specification, fromAftMm, 100 + index)
    const floorZ = (floor.port.z + floor.starboard.z) / 2
    const deck = deckPoint(boat, specification, fromAftMm, 0, `case-deck:${index}`)
    const topZ = Math.min(
      deck.z - 55 / SAIL_GEOMETRY_UNIT_MM,
      floorZ + caseSpecification.heightMm / SAIL_GEOMETRY_UNIT_MM,
    )
    const halfWidth = caseSpecification.halfWidthMm * caseWidthFactors[index] / SAIL_GEOMETRY_UNIT_MM
    const x = longitudinalX(specification, fromAftMm)
    return {
      portBottom: { id: `${boat}:case:pb:${index}`, x, y: -halfWidth, z: floorZ },
      starboardBottom: { id: `${boat}:case:sb:${index}`, x, y: halfWidth, z: floorZ },
      portTop: { id: `${boat}:case:pt:${index}`, x, y: -halfWidth, z: topZ },
      starboardTop: { id: `${boat}:case:st:${index}`, x, y: halfWidth, z: topZ },
    }
  })
  const centerboardCaseFaces = caseSections.slice(0, -1).flatMap((section, index) => {
    const next = caseSections[index + 1]
    return [
      [section.portTop, next.portTop, next.starboardTop, section.starboardTop],
      [section.portBottom, next.portBottom, next.portTop, section.portTop],
      [section.starboardTop, next.starboardTop, next.starboardBottom, section.starboardBottom],
    ]
  })
  centerboardCaseFaces.push(
    [caseSections[0].portBottom, caseSections[0].portTop, caseSections[0].starboardTop, caseSections[0].starboardBottom],
    [caseSections.at(-1)!.portBottom, caseSections.at(-1)!.starboardBottom, caseSections.at(-1)!.starboardTop, caseSections.at(-1)!.portTop],
  )
  const centerboardCaseOutline = [
    ...caseSections.map((section) => section.portTop),
    ...[...caseSections].reverse().map((section) => section.starboardTop),
    caseSections[0].portTop,
  ]

  const thwartSpecification = specification.thwart
  const thwartAft = thwartSpecification.fromAftMm - thwartSpecification.foreAftMm / 2
  const thwartForward = thwartSpecification.fromAftMm + thwartSpecification.foreAftMm / 2
  const makeThwartEnd = (fromAftMm: number, end: 'aft' | 'forward') => {
    const halfWidth = Math.max(120, interpolateCockpitHalfWidth(specification, fromAftMm) - 12)
    const portDeck = deckPoint(boat, specification, fromAftMm, -halfWidth, `thwart:${end}:pd`)
    const starboardDeck = deckPoint(boat, specification, fromAftMm, halfWidth, `thwart:${end}:sd`)
    const topZ = Math.min(portDeck.z, starboardDeck.z) - 18 / SAIL_GEOMETRY_UNIT_MM
    const bottomZ = topZ - thwartSpecification.thicknessMm / SAIL_GEOMETRY_UNIT_MM
    const x = longitudinalX(specification, fromAftMm)
    return {
      portBottom: { id: `${boat}:thwart:${end}:pb`, x, y: portDeck.y, z: bottomZ },
      starboardBottom: { id: `${boat}:thwart:${end}:sb`, x, y: starboardDeck.y, z: bottomZ },
      portTop: { id: `${boat}:thwart:${end}:pt`, x, y: portDeck.y, z: topZ },
      starboardTop: { id: `${boat}:thwart:${end}:st`, x, y: starboardDeck.y, z: topZ },
    }
  }
  const thwartAftSection = makeThwartEnd(thwartAft, 'aft')
  const thwartForwardSection = makeThwartEnd(thwartForward, 'forward')
  const thwartFaces = boxFaces({
    aftPortBottom: thwartAftSection.portBottom,
    aftStarboardBottom: thwartAftSection.starboardBottom,
    aftPortTop: thwartAftSection.portTop,
    aftStarboardTop: thwartAftSection.starboardTop,
    forwardPortBottom: thwartForwardSection.portBottom,
    forwardStarboardBottom: thwartForwardSection.starboardBottom,
    forwardPortTop: thwartForwardSection.portTop,
    forwardStarboardTop: thwartForwardSection.starboardTop,
  })

  const trackHalfWidth = Math.max(
    100,
    interpolateCockpitHalfWidth(specification, specification.mainsheetTrackFromAftMm) - 12,
  )
  const mainsheetTrack = [
    deckPoint(boat, specification, specification.mainsheetTrackFromAftMm, -trackHalfWidth, 'mainsheet-track:p'),
    deckPoint(boat, specification, specification.mainsheetTrackFromAftMm, trackHalfWidth, 'mainsheet-track:s'),
  ]

  const breakwaterStation = interpolateStation(specification, specification.breakwaterFromAftMm)
  const breakwaterHalfSpan = breakwaterStation.halfBeamMm * specification.breakwaterHalfSpanFactor
  const breakwaterFactors = [-1, -0.66, -0.33, 0, 0.33, 0.66, 1]
  const breakwaterSections = breakwaterFactors.map((factor, index) => {
    const sweptFromAft = specification.breakwaterFromAftMm -
      specification.breakwaterSweepMm * Math.pow(Math.abs(factor), 1.55)
    const lateralMm = breakwaterHalfSpan * factor
    const aftBase = deckPoint(boat, specification, sweptFromAft - 12, lateralMm, `breakwater:${index}:ab`)
    const forwardBase = deckPoint(boat, specification, sweptFromAft + 12, lateralMm, `breakwater:${index}:fb`)
    const heightFactor = 0.2 + 0.8 * (1 - Math.pow(Math.abs(factor), 1.35))
    const height = specification.breakwaterHeightMm * heightFactor / SAIL_GEOMETRY_UNIT_MM
    return {
      aftBase,
      forwardBase,
      aftTop: { ...aftBase, id: `${boat}:breakwater:${index}:at`, z: aftBase.z + height },
      forwardTop: { ...forwardBase, id: `${boat}:breakwater:${index}:ft`, z: forwardBase.z + height },
    }
  })
  const breakwaterFaces = breakwaterSections.slice(0, -1).flatMap((section, index) => {
    const next = breakwaterSections[index + 1]
    return [
      [section.aftBase, next.aftBase, next.aftTop, section.aftTop],
      [section.aftTop, next.aftTop, next.forwardTop, section.forwardTop],
      [section.forwardTop, next.forwardTop, next.forwardBase, section.forwardBase],
    ]
  })

  const centerline = deckSections
    .filter((section) => section.fromAftMm >= cockpitEnd)
    .map((section) => section.center)
  const mastStation = interpolateStation(specification, specification.mastFromAftMm)
  const jibTackStation = interpolateStation(specification, specification.jibTackFromAftMm)
  const mastStepBearingZ =
    sheerZ(mastStation) -
    mastStation.keelBelowSheerMm / SAIL_GEOMETRY_UNIT_MM +
    (specification.keelsonHeightMm + 5) / SAIL_GEOMETRY_UNIT_MM
  const mastDeckPoint = deckPoint(boat, specification, specification.mastFromAftMm, 0, 'mast-deck')
  const jibTackDeckPoint = deckPoint(boat, specification, specification.jibTackFromAftMm, 0, 'stemhead')
  const mastBase = { id: `${boat}:mast-heel`, x: 0, y: 0, z: mastStepBearingZ }
  const mastDeck = { ...mastDeckPoint, id: `${boat}:mast-deck` }
  const jibTack = {
    ...jibTackDeckPoint,
    id: `${boat}:stemhead`,
    z: Math.max(jibTackDeckPoint.z, sheerZ(jibTackStation)),
  }

  const allPoints = [
    ...sections.flat(),
    ...transomFaces.flat(),
    ...deckFaces.flat(),
    ...cockpitWallFaces.flat(),
    ...cockpitFloorFaces.flat(),
    ...centerboardCaseFaces.flat(),
    ...thwartFaces.flat(),
    ...breakwaterFaces.flat(),
    ...deckOutline,
    ...cockpitOutline,
    ...cockpitFloorOutline,
    ...centerline,
    ...centerboardCaseOutline,
    ...mainsheetTrack,
    mastBase,
    mastDeck,
    jibTack,
  ]

  return {
    boat,
    sections,
    panels,
    transomFaces,
    deckFaces,
    cockpitWallFaces,
    cockpitFloorFaces,
    centerboardCaseFaces,
    thwartFaces,
    breakwaterFaces,
    deckOutline,
    cockpitOutline,
    cockpitFloorOutline,
    centerline,
    stationLines: sections.slice(0, -1),
    gunwaleLines: [portGunwale, starboardGunwale],
    centerboardCaseOutline,
    mainsheetTrack,
    allPoints,
    mastBase,
    mastDeck,
    jibTack,
  }
}

export function projectHullPoint(
  point: HullPoint,
  view: ProjectionView,
  aftAzimuthDegrees?: number,
): ProjectedHullPoint {
  const projected = projectCoordinate(point, view, aftAzimuthDegrees)
  return { ...point, screenX: projected.x, screenY: projected.y }
}
