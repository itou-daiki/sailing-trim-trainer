import { describe, expect, it } from 'vitest'
import { calculateTrim, outhaulEaseMillimeters, targetControls } from './trimModel'
import {
  AFT_VIEW_DEGREES,
  buildBoomGeometry,
  buildMastGeometry,
  buildRigHardpoints,
  buildRigSurfaces,
  CLASS_BOOM_SPECIFICATIONS,
  CLASS_MAST_SPECIFICATIONS,
  CLASS_RIG_SPECIFICATIONS,
  CLASS_SAIL_SPECIFICATIONS,
  fitProjection,
  getLevelRow,
  measureSurfaceRow,
  projectCoordinate,
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
        (
          CLASS_BOOM_SPECIFICATIONS[boat].outerPointMm -
          specification.main.tackSetbackMm -
          pair.main.footEaseMm
        ) / SAIL_GEOMETRY_UNIT_MM,
        10,
      )
      expect(chordLength(getLevelRow(surfaces.main, 'middle'))).toBeCloseTo(
        (
          (CLASS_BOOM_SPECIFICATIONS[boat].outerPointMm - specification.main.tackSetbackMm) *
          specification.main.outline.find((station) => station.height === 0.5)!.chordRatio -
          pair.main.footEaseMm * 0.5 ** 3
        ) /
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
    const fourTwentyShape = calculateTrim('420', 45, 12, targetControls('420', 45, 12)).actual.main
    const fourSeventyShape = calculateTrim('470', 45, 12, targetControls('470', 45, 12)).actual.main
    const height = (surface: typeof fourTwenty.main) =>
      surface.rows.at(-1)!.points[0].z - surface.rows[0].points[0].z
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
      (
        (2650 - 10) * 0.663 - fourSeventyShape.footEaseMm * 0.5 ** 3
      ) / (
        (2400 - 20) * 0.649 - fourTwentyShape.footEaseMm * 0.5 ** 3
      ),
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

  it('keeps the surface mesh uniform while locating each draft peak exactly', () => {
    const result = calculateTrim('470', 45, 16, targetControls('470', 45, 16))
    const surfaces = buildRigSurfaces('470', result.actual)

    for (const sailKey of ['main', 'jib'] as const) {
      for (const level of LEVELS) {
        const row = getLevelRow(surfaces[sailKey], level)
        const lastColumn = row.points.length - 1

        row.points.forEach((point, column) => {
          expect(point.u).toBeCloseTo(column / lastColumn, 12)
        })
        expect(row.draftPeak.u).toBeCloseTo(
          result.actual[sailKey].sections[level].draftPosition,
          12,
        )
        expect(row.draftPeak.id).toContain(':draft-peak')
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
      source.y * Math.cos(aftView) - source.x * Math.sin(aftView),
      12,
    )
    expect(aft.y).toBeCloseTo(source.z, 12)
    expect(AFT_VIEW_DEGREES).toBe(0)
    expect(aft.x).toBeCloseTo(source.y, 12)
  })

  it('locks each boom outer point to the current class-rule distance', () => {
    for (const boat of ['420', '470'] as const) {
      const result = calculateTrim(boat, 45, 12, targetControls(boat, 45, 12))
      const boom = buildBoomGeometry(boat, buildRigSurfaces(boat, result.actual).main)
      const [start] = boom.centreline
      const [, end] = boom.centreline
      const length = Math.hypot(end.x - start.x, end.y - start.y)
      const direction = {
        x: (end.x - start.x) / length,
        y: (end.y - start.y) / length,
      }
      const distanceMm = (point: typeof start) => (
        (point.x - start.x) * direction.x +
        (point.y - start.y) * direction.y
      ) * SAIL_GEOMETRY_UNIT_MM

      expect(distanceMm(boom.outerPoint)).toBeCloseTo(
        CLASS_BOOM_SPECIFICATIONS[boat].outerPointMm,
        10,
      )
      expect(distanceMm(boom.aftEnd.center)).toBeCloseTo(
        CLASS_BOOM_SPECIFICATIONS[boat].outerPointMm +
          CLASS_BOOM_SPECIFICATIONS[boat].aftEndFittingMm,
        10,
      )
      const markPositions = boom.limitMarkFaces.flat().map((point) => distanceMm(point))
      expect(Math.max(...markPositions) - Math.min(...markPositions)).toBeCloseTo(
        CLASS_BOOM_SPECIFICATIONS[boat].limitMarkWidthMm,
        10,
      )
    }
  })

  it('places the mainsail clew at the physical outhaul distance inboard of the black band', () => {
    for (const boat of ['420', '470'] as const) {
      for (const angle of [45, 90, 140]) {
        for (const outhaul of [0, 50, 100]) {
          const result = calculateTrim(boat, angle, 12, {
            ...targetControls(boat, angle, 12),
            outhaul,
          })
          const main = buildRigSurfaces(boat, result.actual).main
          const boom = buildBoomGeometry(boat, main)
          const [start, end] = boom.centreline
          const length = Math.hypot(end.x - start.x, end.y - start.y)
          const direction = {
            x: (end.x - start.x) / length,
            y: (end.y - start.y) / length,
          }
          const clew = main.rows[0].points.at(-1)!
          const clewToBandMm = (
            (boom.outerPoint.x - clew.x) * direction.x +
            (boom.outerPoint.y - clew.y) * direction.y
          ) * SAIL_GEOMETRY_UNIT_MM

          expect(clewToBandMm).toBeCloseTo(outhaulEaseMillimeters(outhaul), 6)
        }
      }
    }
  })

  it('builds each mast as a class-sized closed spar instead of a display line', () => {
    for (const boat of ['420', '470'] as const) {
      const mast = buildMastGeometry(boat, 0.05)
      const specification = CLASS_MAST_SPECIFICATIONS[boat]
      const section = mast.sections[Math.floor(mast.sections.length / 2)]
      const foreAftMm = (
        Math.max(...section.map((point) => point.x)) -
        Math.min(...section.map((point) => point.x))
      ) * SAIL_GEOMETRY_UNIT_MM
      const transverseMm = (
        Math.max(...section.map((point) => point.y)) -
        Math.min(...section.map((point) => point.y))
      ) * SAIL_GEOMETRY_UNIT_MM

      expect(foreAftMm).toBeCloseTo(specification.foreAftMm, 8)
      expect(transverseMm).toBeCloseTo(specification.transverseMm, 8)
      expect(mast.faces).toHaveLength((mast.sections.length - 1) * 12)
      expect(mast.bottom).toHaveLength(12)
      expect(mast.top).toHaveLength(12)
    }
  })

  it('attaches the entire mainsail foot to the boom top centreline', () => {
    const midpoint = (a: { x: number; y: number; z: number }, b: typeof a) => ({
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      z: (a.z + b.z) / 2,
    })

    for (const boat of ['420', '470'] as const) {
      for (const angle of [45, 90, 140]) {
        const controls = {
          ...targetControls(boat, angle, 14),
          outhaul: 0,
        }
        const result = calculateTrim(boat, angle, 14, controls)
        const main = buildRigSurfaces(boat, result.actual).main
        const boom = buildBoomGeometry(boat, main)
        const foot = main.rows[0].points
        const tack = foot[0]
        const clew = foot.at(-1)!
        const topFace = boom.faces[0]
        const boomTopStart = midpoint(topFace[0], topFace[3])

        expect(boom.tack).toEqual(tack)
        expect(boomTopStart.z).toBeCloseTo(tack.z, 12)
        expect(Math.hypot(
          tack.x - boomTopStart.x,
          tack.y - boomTopStart.y,
        ) * SAIL_GEOMETRY_UNIT_MM).toBeCloseTo(
          CLASS_SAIL_SPECIFICATIONS[boat].main.tackSetbackMm,
          10,
        )
        for (const point of foot) {
          expect(point.x).toBeCloseTo(tack.x + (clew.x - tack.x) * point.u, 12)
          expect(point.y).toBeCloseTo(tack.y + (clew.y - tack.y) * point.u, 12)
          expect(point.z).toBeCloseTo(tack.z + (clew.z - tack.z) * point.u, 12)
        }
      }
    }
  })

  it('aligns the boom-end camera with the boom and shows its mouth face-on', () => {
    const polygonArea = (points: Array<{ x: number; y: number }>) => Math.abs(
      points.reduce((sum, point, index) => {
        const next = points[(index + 1) % points.length]
        return sum + point.x * next.y - next.x * point.y
      }, 0) / 2,
    )

    for (const boat of ['420', '470'] as const) {
      const result = calculateTrim(boat, 45, 12, targetControls(boat, 45, 12))
      const boom = buildBoomGeometry(boat, buildRigSurfaces(boat, result.actual).main)
      const [start, end] = boom.centreline
      const boomAzimuth = Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI
      const outer = boom.aftEnd.outer.map((point) =>
        projectCoordinate(point, 'aft', boomAzimuth))
      const inner = boom.aftEnd.inner.map((point) =>
        projectCoordinate(point, 'aft', boomAzimuth))
      const sightline = boom.centreline.map((point) =>
        projectCoordinate(point, 'aft', boomAzimuth))

      expect(sightline[0].x).toBeCloseTo(sightline[1].x, 12)
      expect(polygonArea(outer)).toBeGreaterThan(0)
      expect(polygonArea(inner)).toBeGreaterThan(0)
      expect(polygonArea(outer)).toBeGreaterThan(polygonArea(inner))
    }
  })

  it('anchors the jib at the deck fitting and treats hoist height as a halyard limit', () => {
    for (const boat of ['420', '470'] as const) {
      const hardpoints = buildRigHardpoints(boat)
      const rig = CLASS_RIG_SPECIFICATIONS[boat]
      const jib = CLASS_SAIL_SPECIFICATIONS[boat].jib
      const distanceMm = (a: typeof hardpoints.jibTack, b: typeof a) =>
        Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) * SAIL_GEOMETRY_UNIT_MM

      expect((hardpoints.mainTack.z - hardpoints.mastHeel.z) * SAIL_GEOMETRY_UNIT_MM)
        .toBeCloseTo(rig.lowerPointHeightMm, 8)
      expect((hardpoints.jibHead.z - hardpoints.mastHeel.z) * SAIL_GEOMETRY_UNIT_MM)
        .toBeLessThan(rig.headsailHoistHeightMm)
      expect(distanceMm(hardpoints.jibTack, hardpoints.jibHead))
        .toBeCloseTo(jib.luffMm, 8)
      expect(distanceMm(hardpoints.jibTack, hardpoints.jibHalyardHoist))
        .toBeGreaterThan(jib.luffMm)
      expect(hardpoints.jibTack.x).toBeCloseTo(hardpoints.stemhead.x, 12)
      expect(hardpoints.jibTack.y).toBe(0)
      expect(hardpoints.jibTack.z).toBeCloseTo(hardpoints.stemhead.z, 12)
      expect(Math.abs(hardpoints.jibHead.x - hardpoints.mainHead.x) * SAIL_GEOMETRY_UNIT_MM)
        .toBeGreaterThan(100)
    }
  })

  it('maps normalized mast controls inside the 40 mm class curvature envelope', () => {
    for (const boat of ['420', '470'] as const) {
      const result = calculateTrim(boat, 45, 20, targetControls(boat, 45, 20))
      const extreme = buildRigSurfaces(boat, {
        ...result.actual,
        main: { ...result.actual.main, mastBend: 1 },
      }).main
      const straight = buildRigSurfaces(boat, {
        ...result.actual,
        main: { ...result.actual.main, mastBend: 0 },
      }).main
      const maximumDeflectionMm = Math.max(
        ...extreme.rows.map((row, index) =>
          Math.abs(row.points[0].x - straight.rows[index].points[0].x)),
      ) * SAIL_GEOMETRY_UNIT_MM

      expect(maximumDeflectionMm).toBeLessThanOrEqual(
        CLASS_RIG_SPECIFICATIONS[boat].mastCurvatureMm + 1e-8,
      )
    }
  })

  it('centres the hull centreplane in plan and true-aft fitted views', () => {
    const asymmetric = [
      { x: -1.2, y: -0.45 },
      { x: 1.5, y: 1.15 },
      { x: 0, y: 0 },
    ]
    const top = fitProjection(asymmetric, 760, 160, 'top')
    const aft = fitProjection(asymmetric, 420, 330, 'aft')

    expect(top({ x: 0, y: 0 }).y).toBeCloseTo(80, 12)
    expect(aft({ x: 0, y: 0 }).x).toBeCloseTo(210, 12)
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
  }, 15_000)
})
