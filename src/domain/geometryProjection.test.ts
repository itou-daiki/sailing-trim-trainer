import { describe, expect, it } from 'vitest'
import { emphasizeMastBendPoint } from './geometryProjection'

describe('SIDE mast bend emphasis', () => {
  const centreline = [
    { x: 0, y: 0, z: 0 },
    { x: 0.35, y: 0, z: 5 },
    { x: 1, y: 0, z: 10 },
  ]

  it('scales only the curve away from the heel-to-head rake axis', () => {
    const point = { id: 'mid', x: 0.35, y: 0.2, z: 5 }
    const emphasized = emphasizeMastBendPoint(point, centreline, 4)

    // The straight raked axis is x=0.5 at mid-height, so the -0.15 bend
    // becomes -0.60 while height and lateral position remain physical.
    expect(emphasized.x).toBeCloseTo(-0.1, 10)
    expect(emphasized.y).toBe(point.y)
    expect(emphasized.z).toBe(point.z)
    expect(emphasized.id).toBe(point.id)
  })

  it('keeps the mast endpoints and actual-scale mode unchanged', () => {
    expect(emphasizeMastBendPoint(centreline[0], centreline, 4)).toEqual(centreline[0])
    expect(emphasizeMastBendPoint(centreline[2], centreline, 4)).toEqual(centreline[2])
    expect(emphasizeMastBendPoint(centreline[1], centreline, 1)).toBe(centreline[1])
  })
})
