import { describe, expect, it } from 'vitest'
import { defaultControls } from './trimModel'
import {
  calculateMastBendProfile,
  mastBendSignal,
  mastControlProfile,
} from './mastResponse'

describe('mast response', () => {
  it('treats Cunningham as an upper-biased secondary bend load', () => {
    for (const boat of ['420', '470'] as const) {
      const loose = calculateMastBendProfile(boat, {
        ...defaultControls,
        cunningham: 0,
      })
      const tight = calculateMastBendProfile(boat, {
        ...defaultControls,
        cunningham: 100,
      })
      const lowerChange = tight.lower - loose.lower
      const middleChange = tight.middle - loose.middle
      const upperChange = tight.upper - loose.upper

      expect(upperChange).toBeGreaterThan(middleChange * 2)
      expect(middleChange).toBeGreaterThan(lowerChange * 2)
      expect(mastBendSignal(boat, tight)).toBeGreaterThan(mastBendSignal(boat, loose))
    }
  })

  it('retains class prebend when every live bending control is eased', () => {
    for (const boat of ['420', '470'] as const) {
      const profile = calculateMastBendProfile(boat, {
        ...defaultControls,
        mainSheet: 0,
        vang: 0,
        cunningham: 0,
        chock: 0,
        forePuller: 0,
        aftPuller: 0,
      })

      expect(mastBendSignal(boat, profile)).toBeGreaterThan(0)
      expect(Math.max(profile.lower, profile.middle, profile.upper)).toBeGreaterThan(0)
    }
  })

  it('uses a larger top-section Cunningham coupling for 470', () => {
    expect(mastControlProfile('470', 'cunningham').upper).toBeGreaterThan(
      mastControlProfile('420', 'cunningham').upper,
    )
  })

  it('keeps chocks and pullers concentrated below the mast top', () => {
    const chock = mastControlProfile('420', 'chock')
    const forePuller = mastControlProfile('470', 'forePuller')
    const aftPuller = mastControlProfile('470', 'aftPuller')

    expect(Math.abs(chock.lower)).toBeGreaterThan(Math.abs(chock.upper) * 5)
    expect(Math.abs(forePuller.lower)).toBeGreaterThan(Math.abs(forePuller.upper) * 2)
    expect(Math.abs(aftPuller.lower)).toBeGreaterThan(Math.abs(aftPuller.upper) * 2)
  })
})
