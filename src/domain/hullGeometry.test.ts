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
})
