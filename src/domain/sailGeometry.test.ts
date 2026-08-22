import { describe, expect, it } from 'vitest'
import { calculateTrim, targetControls } from './trimModel'
import {
  buildRigSurfaces,
  getLevelRow,
  measureSurfaceRow,
  projectSurface,
  SIDE_ELEVATION_DEGREES,
  SIDE_OBLIQUE_DEGREES,
} from './sailGeometry'

const LEVELS = ['lower', 'middle', 'upper'] as const

describe('single sail surface geometry', () => {
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
      }
    }
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

    expect(top.x).toBeCloseTo(source.x, 12)
    expect(top.y).toBeCloseTo(source.y, 12)
    expect(side.x).toBeCloseTo(source.x * Math.cos(oblique) + source.y * Math.sin(oblique), 12)
    expect(side.y).toBeCloseTo(
      -source.x * Math.sin(elevation) * Math.sin(oblique) +
      source.y * Math.sin(elevation) * Math.cos(oblique) +
      source.z * Math.cos(elevation),
      12,
    )
    expect(aft.x).toBeCloseTo(source.y, 12)
    expect(aft.y).toBeCloseTo(source.z, 12)
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
