import { describe, expect, it } from 'vitest'
import {
  buildHullGeometry,
  HULL_SPECIFICATIONS,
  projectHullPoint,
} from './hullGeometry'
import { SAIL_GEOMETRY_UNIT_MM } from './sailGeometry'

describe('class-specific hull geometry', () => {
  it('reproduces the official length, beam, mast and jib-tack hardpoints', () => {
    for (const boat of ['420', '470'] as const) {
      const specification = HULL_SPECIFICATIONS[boat]
      const hull = buildHullGeometry(boat)
      const aft = hull.sections[0][3]
      const bow = hull.sections.at(-1)![3]
      const maximumHalfBeam = Math.max(
        ...hull.sections.flatMap((section) => section.map((point) => Math.abs(point.y))),
      )

      expect((aft.x - bow.x) * SAIL_GEOMETRY_UNIT_MM).toBeCloseTo(
        specification.lengthMm,
        8,
      )
      expect(maximumHalfBeam * 2 * SAIL_GEOMETRY_UNIT_MM).toBeCloseTo(
        specification.beamMm,
        8,
      )
      expect(hull.mastBase.x).toBe(0)
      expect(hull.jibTack.x * SAIL_GEOMETRY_UNIT_MM).toBeCloseTo(
        specification.mastFromAftMm - specification.jibTackFromAftMm,
        8,
      )
    }
  })

  it('projects the exact same hull vertices through all three cameras', () => {
    const hull = buildHullGeometry('470')
    const source = hull.sections.flat()
    const ids = (['top', 'side', 'aft'] as const).map((view) =>
      source.map((point) => projectHullPoint(point, view).id),
    )

    expect(ids[1]).toEqual(ids[0])
    expect(ids[2]).toEqual(ids[0])
  })

  it('keeps 420 and 470 as different station models, not uniform scales', () => {
    const fourTwenty = buildHullGeometry('420')
    const fourSeventy = buildHullGeometry('470')

    expect(fourTwenty.sections).toHaveLength(12)
    expect(fourSeventy.sections).toHaveLength(11)
    expect(fourTwenty.cockpitOutline).not.toHaveLength(fourSeventy.cockpitOutline.length)
    expect(HULL_SPECIFICATIONS['420'].breakwaterFromAftMm).toBe(2920)
    expect(HULL_SPECIFICATIONS['470'].breakwaterFromAftMm).toBe(3250)
  })

  it('keeps every hull section and both rig fittings on the centreplane', () => {
    for (const boat of ['420', '470'] as const) {
      const hull = buildHullGeometry(boat)

      for (const section of hull.sections) {
        for (let index = 0; index < Math.floor(section.length / 2); index += 1) {
          const opposite = section[section.length - 1 - index]
          expect(section[index].y).toBeCloseTo(-opposite.y, 12)
          expect(section[index].z).toBeCloseTo(opposite.z, 12)
        }
      }
      expect(hull.mastBase.y).toBe(0)
      expect(hull.mastDeck.y).toBe(0)
      expect(hull.mastDeck.z).toBeGreaterThan(hull.mastBase.z)
      expect(hull.jibTack.y).toBe(0)
    }
  })

  it('builds the visible construction as a closed multi-part dinghy model', () => {
    for (const boat of ['420', '470'] as const) {
      const hull = buildHullGeometry(boat)

      expect(hull.transomFaces).toHaveLength(1)
      expect(hull.deckFaces.length).toBeGreaterThan(hull.sections.length)
      expect(hull.cockpitFloorFaces.length).toBeGreaterThan(4)
      expect(hull.cockpitWallFaces.length).toBeGreaterThan(8)
      expect(hull.centerboardCaseFaces.length).toBeGreaterThan(8)
      expect(hull.thwartFaces).toHaveLength(5)
      expect(hull.breakwaterFaces.length).toBeGreaterThan(12)
      expect(hull.gunwaleLines).toHaveLength(2)
      expect(hull.mainsheetTrack).toHaveLength(2)

      const transomIds = new Set(hull.transomFaces[0].map((point) => point.id))
      for (const point of hull.sections[0]) expect(transomIds.has(point.id)).toBe(true)
      expect(hull.transomFaces[0][0].id).toBe(hull.transomFaces[0].at(-1)!.id)
      expect(hull.cockpitFloorOutline[0].x).toBeCloseTo(hull.sections[0][0].x, 12)
      expect(hull.centerline.at(-1)!.z).toBeCloseTo(
        hull.sections.at(-1)![Math.floor(hull.sections.at(-1)!.length / 2)].z,
        12,
      )
    }
  })

  it('keeps cockpit furniture within its class-plan dimensions', () => {
    for (const boat of ['420', '470'] as const) {
      const specification = HULL_SPECIFICATIONS[boat]
      const hull = buildHullGeometry(boat)
      const casePoints = hull.centerboardCaseFaces.flat()
      const maximumCaseWidth = Math.max(...casePoints.map((point) => Math.abs(point.y))) * 2

      expect(maximumCaseWidth * SAIL_GEOMETRY_UNIT_MM).toBeCloseTo(
        specification.centerboardCase.halfWidthMm * 2,
        8,
      )
      expect(
        Math.abs(hull.mainsheetTrack[0].x - hull.mainsheetTrack[1].x),
      ).toBeCloseTo(0, 12)
      expect(
        (specification.mastFromAftMm / SAIL_GEOMETRY_UNIT_MM) -
          hull.mainsheetTrack[0].x,
      ).toBeCloseTo(specification.mainsheetTrackFromAftMm / SAIL_GEOMETRY_UNIT_MM, 8)
    }
  })

  it('keeps the cockpit below its rim and every generated coordinate finite', () => {
    for (const boat of ['420', '470'] as const) {
      const hull = buildHullGeometry(boat)
      const highestFloorPoint = Math.max(
        ...hull.cockpitFloorFaces.flat().map((point) => point.z),
      )
      const lowestRimPoint = Math.min(...hull.cockpitOutline.map((point) => point.z))

      expect(highestFloorPoint).toBeLessThan(lowestRimPoint)
      expect(hull.allPoints.length).toBeGreaterThan(500)
      for (const point of hull.allPoints) {
        expect(Number.isFinite(point.x)).toBe(true)
        expect(Number.isFinite(point.y)).toBe(true)
        expect(Number.isFinite(point.z)).toBe(true)
      }
    }
  })
})
