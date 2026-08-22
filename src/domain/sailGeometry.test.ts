import { describe, expect, it } from 'vitest'
import { calculateTrim, targetControls } from './trimModel'
import {
  AFT_VIEW_DEGREES,
  buildRigSurfaces,
  CLASS_SAIL_SPECIFICATIONS,
  getLevelRow,
  measureSurfaceRow,
  projectSurface,
  SAIL_GEOMETRY_UNIT_MM,
  sectionAtHeight,
  SIDE_ELEVATION_DEGREES,
  SIDE_OBLIQUE_DEGREES,
} from './sailGeometry'

const LEVELS = ['lower', 'middle', 'upper'] as const

describe('single sail surface geometry', () => {
  it('matches the sampled M-12 and current N17-L26 product silhouettes', () => {
    const reference = {
      '420': [
        [0.125, 0.926], [0.25, 0.842], [0.5, 0.649], [0.75, 0.421], [0.875, 0.246],
      ],
      '470': [
        [0.125, 0.934], [0.25, 0.86], [0.5, 0.663], [0.75, 0.399], [0.875, 0.225],
      ],
    } as const

    for (const boat of ['420', '470'] as const) {
      for (const [height, expectedRatio] of reference[boat]) {
        const station = CLASS_SAIL_SPECIFICATIONS[boat].main.outline.find(
          (candidate) => candidate.height === height,
        )
        expect(station?.chordRatio).toBeCloseTo(expectedRatio, 3)
      }
    }
  })

  it('uses the class mast limit distance for mainsail luff height', () => {
    for (const boat of ['420', '470'] as const) {
      const result = calculateTrim(boat, 45, 12, targetControls(boat, 45, 12))
      const main = buildRigSurfaces(boat, result.actual).main
      const tack = main.rows[0].points[0]
      const head = main.rows.at(-1)!.points[0]

      expect((head.z - tack.z) * SAIL_GEOMETRY_UNIT_MM).toBeCloseTo(
        CLASS_SAIL_SPECIFICATIONS[boat].main.luffMm,
        8,
      )
    }
  })

  it('keeps every class-rule jib corner dimension under all sheet angles', () => {
    for (const boat of ['420', '470'] as const) {
      const result = calculateTrim(boat, 90, 12, targetControls(boat, 90, 12))
      const specification = CLASS_SAIL_SPECIFICATIONS[boat].jib
      for (const angle of [5, 20, 45, 70]) {
        const jib = buildRigSurfaces(boat, {
          ...result.actual,
          jib: { ...result.actual.jib, angle },
        }).jib
        const tack = jib.rows[0].points[0]
        const clew = jib.rows[0].points.at(-1)!
        const head = jib.rows.at(-1)!.points[0]
        const aftHead = jib.rows.at(-1)!.points.at(-1)!
        const distanceMm = (a: typeof tack, b: typeof tack) =>
          Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) * SAIL_GEOMETRY_UNIT_MM

        expect(distanceMm(tack, head)).toBeCloseTo(specification.luffMm, 6)
        expect(distanceMm(head, clew)).toBeCloseTo(specification.leechMm, 6)
        expect(distanceMm(tack, clew)).toBeCloseTo(specification.footMm, 6)
        expect(distanceMm(head, aftHead)).toBeCloseTo(specification.topWidthMm, 6)
      }
    }
  })

  it('locks the complete jib luff while sheet angle and twist change', () => {
    const result = calculateTrim('420', 90, 12, targetControls('420', 90, 12))
    const baseline = buildRigSurfaces('420', result.actual).jib
    const changed = buildRigSurfaces('420', {
      ...result.actual,
      jib: {
        ...result.actual.jib,
        angle: 70,
        sections: {
          lower: { ...result.actual.jib.sections.lower, twist: 1 },
          middle: { ...result.actual.jib.sections.middle, twist: 14 },
          upper: { ...result.actual.jib.sections.upper, twist: 25 },
        },
      },
    }).jib

    expect(changed.rows.map((row) => row.points[0])).toEqual(
      baseline.rows.map((row) => row.points[0]),
    )
  })

  it('varies shape continuously below 25% and above 75% instead of freezing it', () => {
    const shape = calculateTrim(
      '470',
      90,
      16,
      targetControls('470', 90, 16),
    ).actual.main
    const bottom = sectionAtHeight(shape, 0)
    const lower = sectionAtHeight(shape, 0.25)
    const justBelowLower = sectionAtHeight(shape, 0.249)
    const justAboveLower = sectionAtHeight(shape, 0.251)
    const upper = sectionAtHeight(shape, 0.75)
    const top = sectionAtHeight(shape, 1)

    expect(bottom.draftDepth).not.toBeCloseTo(lower.draftDepth, 6)
    expect(top.twist).not.toBeCloseTo(upper.twist, 6)
    expect(justBelowLower.draftDepth).toBeCloseTo(justAboveLower.draftDepth, 3)
    expect(Number.isFinite(bottom.draftPosition)).toBe(true)
    expect(Number.isFinite(top.twist)).toBe(true)
  })

  it('keeps the class-rule jib outline fair between its straight luff and leech', () => {
    for (const boat of ['420', '470'] as const) {
      const ratios = CLASS_SAIL_SPECIFICATIONS[boat].jib.outline.map(
        (station) => station.chordRatio,
      )
      const stepChanges = ratios.slice(2).map((ratio, index) =>
        Math.abs((ratio - ratios[index + 1]) - (ratios[index + 1] - ratios[index])),
      )
      expect(Math.max(...stepChanges)).toBeLessThan(0.0021)
      expect(ratios.every((ratio, index) => index === 0 || ratio < ratios[index - 1])).toBe(true)
    }
  })

  it('keeps rule dimensions while using the sailmaker silhouette as horizontal chords', () => {
    for (const boat of ['420', '470'] as const) {
      const result = calculateTrim(boat, 45, 12, targetControls(boat, 45, 12))
      const pair = {
        ...result.actual,
        main: { ...result.actual.main, mastBend: 0 },
      }
      const surfaces = buildRigSurfaces(boat, pair)
      const specification = CLASS_SAIL_SPECIFICATIONS[boat]
      const chordLength = (row: (typeof surfaces.main.rows)[number]) => {
        const luff = row.points[0]
        const leech = row.points.at(-1)!
        return Math.hypot(
          leech.x - luff.x,
          leech.y - luff.y,
          leech.z - luff.z,
        )
      }

      expect(chordLength(surfaces.main.rows[0])).toBeCloseTo(
        specification.main.footMm / SAIL_GEOMETRY_UNIT_MM,
        10,
      )
      expect(chordLength(getLevelRow(surfaces.main, 'middle'))).toBeCloseTo(
        specification.main.footMm *
          specification.main.outline.find((station) => station.height === 0.5)!.chordRatio /
          SAIL_GEOMETRY_UNIT_MM,
        10,
      )
      expect(chordLength(surfaces.jib.rows[0])).toBeCloseTo(
        specification.jib.footMm / SAIL_GEOMETRY_UNIT_MM,
        10,
      )
      expect(surfaces.main.rows.filter((row) => row.battenStartU !== undefined)).toHaveLength(
        specification.main.battens.length,
      )
      expect(surfaces.jib.rows.filter((row) => row.battenStartU !== undefined)).toHaveLength(
        specification.jib.battens.length,
      )
    }
  })

  it('keeps 470 taller and broader than 420 instead of uniformly scaling one outline', () => {
    const surfaces = (boat: '420' | '470') => {
      const result = calculateTrim(boat, 45, 12, targetControls(boat, 45, 12))
      return buildRigSurfaces(boat, {
        ...result.actual,
        main: { ...result.actual.main, mastBend: 0 },
      })
    }
    const fourTwenty = surfaces('420')
    const fourSeventy = surfaces('470')
    const height = (surface: typeof fourTwenty.main) => surface.rows.at(-1)!.points[0].z
    const chord = (surface: typeof fourTwenty.main, level: (typeof LEVELS)[number]) => {
      const row = getLevelRow(surface, level)
      const luff = row.points[0]
      const leech = row.points.at(-1)!
      return Math.hypot(
        leech.x - luff.x,
        leech.y - luff.y,
        leech.z - luff.z,
      )
    }

    expect(height(fourSeventy.main) / height(fourTwenty.main)).toBeCloseTo(5750 / 4900, 10)
    expect(chord(fourSeventy.main, 'middle') / chord(fourTwenty.main, 'middle')).toBeCloseTo(
      (2200 * 0.663) / (1920 * 0.649),
      10,
    )
    expect(fourTwenty.main.rows.filter((row) => row.battenStartU !== undefined)).toHaveLength(4)
    expect(fourSeventy.main.rows.filter((row) => row.battenStartU !== undefined)).toHaveLength(3)
  })

  it('realizes every displayed section value in the 3D mesh', () => {
    const result = calculateTrim('420', 90, 12, targetControls('420', 90, 12))
    const surfaces = buildRigSurfaces('420', result.actual)

    for (const sailKey of ['main', 'jib'] as const) {
      for (const level of LEVELS) {
        const expected = result.actual[sailKey].sections[level]
        const measured = measureSurfaceRow(
          getLevelRow(surfaces[sailKey], level),
          result.actual[sailKey].angle,
        )

        expect(measured.draftDepth).toBeCloseTo(expected.draftDepth, 10)
        expect(measured.draftPosition).toBeCloseTo(expected.draftPosition, 10)
        expect(measured.twist).toBeCloseTo(expected.twist, 10)
        expect(measured.entryAngle).toBeGreaterThan(0)
        expect(measured.exitAngle).toBeGreaterThan(0)
      }
    }
  })

  it('reports finite entry and exit angles for professional stripe comparison', () => {
    const result = calculateTrim('470', 45, 16, targetControls('470', 45, 16))
    const row = getLevelRow(buildRigSurfaces('470', result.actual).main, 'middle')
    const measured = measureSurfaceRow(row, result.actual.main.angle)

    expect(Number.isFinite(measured.entryAngle)).toBe(true)
    expect(Number.isFinite(measured.exitAngle)).toBe(true)
    expect(measured.entryAngle).toBeGreaterThan(measured.exitAngle)
  })

  it('projects the same vertex identities through all three cameras', () => {
    const result = calculateTrim('470', 45, 14, targetControls('470', 45, 14))
    const surface = buildRigSurfaces('470', result.actual).main
    const views = ['top', 'side', 'aft'] as const
    const projected = views.map((view) => projectSurface(surface, view))
    const ids = projected.map((projection) =>
      projection.rows.flatMap((row) => row.points.map((point) => point.id)),
    )

    expect(ids[1]).toEqual(ids[0])
    expect(ids[2]).toEqual(ids[0])

    const source = surface.rows[4].points[9]
    const top = projected[0].rows[4].points[9]
    const side = projected[1].rows[4].points[9]
    const aft = projected[2].rows[4].points[9]
    const oblique = (SIDE_OBLIQUE_DEGREES * Math.PI) / 180
    const elevation = (SIDE_ELEVATION_DEGREES * Math.PI) / 180
    const aftView = (AFT_VIEW_DEGREES * Math.PI) / 180

    expect(top.x).toBeCloseTo(source.x, 12)
    expect(top.y).toBeCloseTo(source.y, 12)
    expect(side.x).toBeCloseTo(source.x * Math.cos(oblique) + source.y * Math.sin(oblique), 12)
    expect(side.y).toBeCloseTo(
      -source.x * Math.sin(elevation) * Math.sin(oblique) +
      source.y * Math.sin(elevation) * Math.cos(oblique) +
      source.z * Math.cos(elevation),
      12,
    )
    expect(aft.x).toBeCloseTo(
      source.y * Math.cos(aftView) + source.x * Math.sin(aftView),
      12,
    )
    expect(aft.y).toBeCloseTo(source.z, 12)
    expect(AFT_VIEW_DEGREES).toBe(0)
    expect(aft.x).toBeCloseTo(source.y, 12)
  })

  it('keeps the whole geometry finite across boats, courses, winds, and control edges', () => {
    const values = [0, 50, 100]

    for (const boat of ['420', '470'] as const) {
      for (const angle of [40, 45, 90, 140, 160]) {
        for (const wind of [4, 8, 12, 18, 22]) {
          const target = targetControls(boat, angle, wind)
          for (const edge of values) {
            const controls = {
              ...target,
              vang: edge,
              cunningham: 100 - edge,
              outhaul: edge,
              chock: 100 - edge,
              forePuller: edge,
              aftPuller: 100 - edge,
              jibHeight: edge,
              jibLeadForeAft: 100 - edge,
            }
            const result = calculateTrim(boat, angle, wind, controls)
            const surfaces = buildRigSurfaces(boat, result.actual)

            for (const surface of [surfaces.main, surfaces.jib]) {
              for (const row of surface.rows) {
                for (const point of row.points) {
                  expect(Number.isFinite(point.x)).toBe(true)
                  expect(Number.isFinite(point.y)).toBe(true)
                  expect(Number.isFinite(point.z)).toBe(true)
                }
              }
            }
          }
        }
      }
    }
  })
})
