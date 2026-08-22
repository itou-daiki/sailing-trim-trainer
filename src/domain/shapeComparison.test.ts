import { describe, expect, it } from 'vitest'
import { calculateTrim, targetControls } from './trimModel'
import { compareShapeChange, focusForControl } from './shapeComparison'

describe('shape comparison', () => {
  it('selects the stripe where each control is easiest to observe', () => {
    expect(focusForControl('vang')).toEqual({ sail: 'main', level: 'upper' })
    expect(focusForControl('outhaul')).toEqual({ sail: 'main', level: 'lower' })
    expect(focusForControl('jibHeight')).toEqual({ sail: 'jib', level: 'upper' })
  })

  it('records cunningham movement as a forward draft change', () => {
    const controls = targetControls('470', 45, 16)
    const before = calculateTrim('470', 45, 16, { ...controls, cunningham: 0 })
    const after = calculateTrim('470', 45, 16, { ...controls, cunningham: 100 })
    const delta = compareShapeChange(before, after, 'cunningham')

    expect(delta.sail).toBe('main')
    expect(delta.level).toBe('middle')
    expect(delta.draftPositionPoints).toBeLessThan(0)
  })

  it('records the strongest vang response at the upper stripe', () => {
    const controls = targetControls('420', 90, 12)
    const before = calculateTrim('420', 90, 12, { ...controls, vang: 0 })
    const after = calculateTrim('420', 90, 12, { ...controls, vang: 100 })
    const delta = compareShapeChange(before, after, 'vang')

    expect(delta.level).toBe('upper')
    expect(delta.twistDegrees).toBeLessThan(0)
  })
})
