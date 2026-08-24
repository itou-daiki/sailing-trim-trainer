import { describe, expect, it } from 'vitest'
import { diagnoseMainCloth } from './sailCloth'
import { calculateTrim, targetControls } from './trimModel'

describe('420 / 470 sail-cloth cues', () => {
  it('keeps short light-air wrinkles as an acceptable 420 cue', () => {
    const targets = targetControls('420', 45, 4)
    const result = calculateTrim('420', 45, 4, targets)
    const cloth = diagnoseMainCloth({
      boat: '420',
      windSpeed: 4,
      controls: targets,
      targetControls: targets,
      mastBend: result.actual.main.mastBend,
      targetMastBend: result.target.main.mastBend,
    })

    expect(cloth.status).toBe('speed')
    expect(cloth.tone).toBe('good')
    expect(cloth.traces.length).toBeGreaterThanOrEqual(2)
  })

  it('distinguishes cunningham slack from acceptable wrinkles', () => {
    const targets = targetControls('470', 45, 18)
    const controls = { ...targets, cunningham: 0 }
    const result = calculateTrim('470', 45, 18, controls)
    const cloth = diagnoseMainCloth({
      boat: '470',
      windSpeed: 18,
      controls,
      targetControls: targets,
      mastBend: result.actual.main.mastBend,
      targetMastBend: result.target.main.mastBend,
    })

    expect(cloth.status).toBe('luff-slack')
    expect(cloth.tone).toBe('watch')
  })

  it('prioritizes diagonal overbend wrinkles over luff tension cosmetics', () => {
    const targets = targetControls('420', 45, 16)
    const controls = { ...targets, vang: 100, chock: 0, cunningham: 0 }
    const result = calculateTrim('420', 45, 16, controls)
    const cloth = diagnoseMainCloth({
      boat: '420',
      windSpeed: 16,
      controls,
      targetControls: targets,
      mastBend: result.actual.main.mastBend,
      targetMastBend: result.target.main.mastBend,
    })

    expect(cloth.status).toBe('overbend')
    expect(cloth.traces.every((trace) => trace.kind === 'overbend')).toBe(true)
  })
})
