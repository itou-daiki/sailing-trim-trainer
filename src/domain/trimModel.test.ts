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

  it('models each draft stripe as an independent section', () => {
    const result = calculateTrim('420', 45, 10, targetControls('420', 45, 10))
    const { lower, middle, upper } = result.actual.main.sections

    expect(lower.height).toBe(0.25)
    expect(middle.height).toBe(0.5)
    expect(upper.height).toBe(0.75)
    expect(lower.draftDepth).toBeGreaterThan(middle.draftDepth)
    expect(middle.draftDepth).toBeGreaterThan(upper.draftDepth)
    expect(lower.twist).toBeLessThan(middle.twist)
    expect(middle.twist).toBeLessThan(upper.twist)
    expect(result.actual.main.draftDepth).toBe(middle.draftDepth)
    expect(result.actual.main.twist).toBe(upper.twist)
  })

  it('concentrates the outhaul response in the lower third', () => {
    const controls = targetControls('420', 45, 10)
    const loose = calculateTrim('420', 45, 10, { ...controls, outhaul: 0 }).actual.main.sections
    const tight = calculateTrim('420', 45, 10, { ...controls, outhaul: 100 }).actual.main.sections
    const lowerChange = loose.lower.draftDepth - tight.lower.draftDepth
    const middleChange = loose.middle.draftDepth - tight.middle.draftDepth
    const upperChange = loose.upper.draftDepth - tight.upper.draftDepth

    expect(lowerChange).toBeGreaterThan(middleChange * 2)
    expect(middleChange).toBeGreaterThan(upperChange * 2)
  })

  it('moves all main draft stripes forward with cunningham tension', () => {
    const controls = targetControls('470', 45, 14)
    const loose = calculateTrim('470', 45, 14, { ...controls, cunningham: 0 }).actual.main.sections
    const tight = calculateTrim('470', 45, 14, { ...controls, cunningham: 100 }).actual.main.sections

    for (const level of ['lower', 'middle', 'upper'] as const) {
      expect(tight[level].draftPosition).toBeLessThan(loose[level].draftPosition)
    }
    expect(loose.upper.draftPosition - tight.upper.draftPosition).toBeGreaterThan(
      loose.lower.draftPosition - tight.lower.draftPosition,
    )
  })

  it('makes vang response largest at the upper leech', () => {
    const controls = targetControls('420', 90, 12)
    const loose = calculateTrim('420', 90, 12, { ...controls, vang: 0 }).actual.main.sections
    const tight = calculateTrim('420', 90, 12, { ...controls, vang: 100 }).actual.main.sections
    const lowerChange = loose.lower.twist - tight.lower.twist
    const middleChange = loose.middle.twist - tight.middle.twist
    const upperChange = loose.upper.twist - tight.upper.twist

    expect(upperChange).toBeGreaterThan(middleChange)
    expect(middleChange).toBeGreaterThan(lowerChange)
  })

  it('uses the 420 chock to resist unwanted lower-mast flattening', () => {
    const controls = targetControls('420', 45, 16)
    const unsupported = calculateTrim('420', 45, 16, { ...controls, vang: 90, chock: 0 })
    const supported = calculateTrim('420', 45, 16, { ...controls, vang: 90, chock: 100 })

    expect(supported.actual.main.sections.lower.draftDepth).toBeGreaterThan(
      unsupported.actual.main.sections.lower.draftDepth,
    )
  })

  it('treats the 470 fore and aft pullers as opposing lower-mast controls', () => {
    const controls = targetControls('470', 45, 12)
    const forward = calculateTrim('470', 45, 12, { ...controls, forePuller: 100, aftPuller: 0 })
    const aft = calculateTrim('470', 45, 12, { ...controls, forePuller: 0, aftPuller: 100 })

    expect(forward.actual.main.sections.lower.draftDepth).toBeLessThan(
      aft.actual.main.sections.lower.draftDepth,
    )
    expect(forward.actual.main.sections.middle.draftDepth).toBeLessThan(
      aft.actual.main.sections.middle.draftDepth,
    )
  })

  it('opens or closes the jib leech through class-specific vertical lead controls', () => {
    const controls420 = targetControls('420', 45, 10)
    const low420 = calculateTrim('420', 45, 10, { ...controls420, jibHeight: 0 })
    const high420 = calculateTrim('420', 45, 10, { ...controls420, jibHeight: 100 })
    expect(high420.actual.jib.sections.upper.twist).toBeLessThan(low420.actual.jib.sections.upper.twist)

    const controls470 = targetControls('470', 45, 10)
    const aft470 = calculateTrim('470', 45, 10, { ...controls470, jibLeadForeAft: 0 })
    const forward470 = calculateTrim('470', 45, 10, { ...controls470, jibLeadForeAft: 100 })
    expect(forward470.actual.jib.sections.upper.twist).toBeLessThan(aft470.actual.jib.sections.upper.twist)
    expect(forward470.actual.jib.sections.lower.draftDepth).toBeGreaterThan(
      aft470.actual.jib.sections.lower.draftDepth,
    )
  })

  it('follows the 420 guide sequence as wind builds', () => {
    const light = targetControls('420', 45, 8)
    const fresh = targetControls('420', 45, 16)

    expect(fresh.vang).toBeGreaterThan(light.vang)
    expect(fresh.cunningham).toBeGreaterThan(light.cunningham)
    expect(fresh.outhaul).toBeGreaterThan(light.outhaul)
    expect(fresh.chock).toBeGreaterThan(light.chock)
  })

  it('keeps every generated stripe inside the calibrated display domain', () => {
    const angles = [40, 45, 90, 140, 150]
    const winds = [4, 8, 12, 18]

    for (const boat of ['420', '470'] as const) {
      for (const angle of angles) {
        for (const wind of winds) {
          const baseline = targetControls(boat, angle, wind)
          const variants = [
            baseline,
            { ...baseline, vang: 0, cunningham: 0, outhaul: 0, chock: 0, forePuller: 0, aftPuller: 100 },
            { ...baseline, vang: 100, cunningham: 100, outhaul: 100, chock: 100, forePuller: 100, aftPuller: 0 },
          ]

          for (const controls of variants) {
            const result = calculateTrim(boat, angle, wind, controls)
            for (const sail of [result.actual.main, result.actual.jib]) {
              const { lower, middle, upper } = sail.sections
              for (const section of [lower, middle, upper]) {
                expect(Number.isFinite(section.draftDepth)).toBe(true)
                expect(section.draftDepth).toBeGreaterThanOrEqual(0.05)
                expect(section.draftDepth).toBeLessThanOrEqual(0.2)
                expect(section.draftPosition).toBeGreaterThanOrEqual(0.3)
                expect(section.draftPosition).toBeLessThanOrEqual(0.55)
                expect(section.twist).toBeGreaterThanOrEqual(0)
                expect(section.twist).toBeLessThanOrEqual(24)
              }
              expect(lower.draftDepth).toBeGreaterThan(upper.draftDepth)
              expect(lower.twist).toBeLessThanOrEqual(middle.twist)
              expect(middle.twist).toBeLessThanOrEqual(upper.twist)
            }
          }
        }
      }
    }
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
