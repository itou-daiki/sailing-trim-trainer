import { describe, expect, it } from 'vitest'
import { calculateTrim, targetControls } from './trimModel'

describe('trim model', () => {
  it('gives the target setup a high efficiency score', () => {
    const controls = targetControls('420', 45, 8)
    const result = calculateTrim('420', 45, 8, controls)

    expect(result.metrics.efficiency).toBeGreaterThanOrEqual(99)
    expect(result.guidance.tone).toBe('good')
    expect(result.actions).toHaveLength(0)
  })

  it('keeps the basic sail angles automatically aligned after a course change', () => {
    const closeHauled = targetControls('420', 45, 8)
    const reach = calculateTrim('420', 90, 8, closeHauled)

    expect(reach.targetControls.mainSheet).toBeLessThan(closeHauled.mainSheet)
    expect(reach.targetControls.jibSheet).toBeLessThan(closeHauled.jibSheet)
    expect(reach.actual.main.angle).toBe(reach.target.main.angle)
    expect(reach.actual.jib.angle).toBe(reach.target.jib.angle)
    expect(reach.actions.map((action) => action.control)).not.toContain('mainSheet')
    expect(reach.actions.map((action) => action.control)).not.toContain('jibSheet')
  })

  it('ignores balance, centerboard, and basic-angle controls in shape scoring', () => {
    const controls = targetControls('420', 45, 8)
    controls.mainSheet = 0
    controls.jibSheet = 0
    controls.crewHike = 0
    controls.crewForeAft = 100
    controls.centerboard = 0
    controls.windwardSheet = 100
    const result = calculateTrim('420', 45, 8, controls)

    expect(result.metrics.efficiency).toBe(100)
    expect(result.metrics.heel).toBe(0)
    expect(result.metrics.leeway).toBe(0)
    expect(result.metrics.balance).toBe(100)
    expect(result.actions).toHaveLength(0)
  })

  it('moves the main draft forward as cunningham tension increases', () => {
    const loose = targetControls('470', 45, 12)
    loose.cunningham = 0
    const tight = { ...loose, cunningham: 100 }

    expect(calculateTrim('470', 45, 12, tight).actual.main.draftPosition).toBeLessThan(
      calculateTrim('470', 45, 12, loose).actual.main.draftPosition,
    )
  })

  it('reduces main twist as vang tension increases', () => {
    const controls = targetControls('420', 90, 10)
    const loose = calculateTrim('420', 90, 10, { ...controls, vang: 0 })
    const tight = calculateTrim('420', 90, 10, { ...controls, vang: 100 })

    expect(tight.actual.main.twist).toBeLessThan(loose.actual.main.twist)
  })

  it('shows extra load moving the draft aft when wind rises without retrimming', () => {
    const controls = targetControls('420', 45, 8)
    const medium = calculateTrim('420', 45, 8, controls)
    const fresh = calculateTrim('420', 45, 16, controls)

    expect(fresh.actual.main.draftPosition).toBeGreaterThan(medium.actual.main.draftPosition)
    expect(fresh.actual.main.draftDepth).toBeGreaterThan(medium.actual.main.draftDepth)
  })

  it('uses class-specific rig controls', () => {
    const controls420 = targetControls('420', 45, 14)
    const controls470 = targetControls('470', 45, 14)

    expect(controls420.windwardSheet).toBeGreaterThan(0)
    expect(controls470.windwardSheet).toBe(0)
    expect(controls470.forePuller).not.toBe(50)
  })

  it('keeps outputs in safe display ranges under extreme inputs', () => {
    const controls = Object.fromEntries(
      Object.keys(targetControls('470', 45, 8)).map((key, index) => [key, index % 2 ? 0 : 100]),
    ) as ReturnType<typeof targetControls>
    const result = calculateTrim('470', 160, 22, controls)

    expect(result.metrics.speed).toBeGreaterThanOrEqual(0)
    expect(result.metrics.speed).toBeLessThanOrEqual(7.8)
    expect(result.metrics.heel).toBeGreaterThanOrEqual(0)
    expect(result.actual.main.draftDepth).toBeGreaterThan(0)
    expect(Number.isFinite(result.apparentWindSpeed)).toBe(true)
  })
})
