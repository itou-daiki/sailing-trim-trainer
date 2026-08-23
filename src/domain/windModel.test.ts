import { describe, expect, it } from 'vitest'
import { apparentWind, optimalMainTrim } from './windModel'

describe('apparent-wind mainsail trim', () => {
  it('returns true wind when the boat is stopped', () => {
    const wind = apparentWind(90, 10, 0)

    expect(wind.angle).toBeCloseTo(90, 8)
    expect(wind.speed).toBeCloseTo(10, 8)
  })

  it('moves apparent wind forward as boat speed increases', () => {
    const slow = apparentWind(90, 10, 2)
    const fast = apparentWind(90, 10, 7)

    expect(fast.angle).toBeLessThan(slow.angle)
    expect(fast.speed).toBeGreaterThan(slow.speed)
  })

  it('sheets in on a reach when acceleration moves apparent wind forward', () => {
    const slow = optimalMainTrim('420', 90, 10, 2)
    const fast = optimalMainTrim('420', 90, 10, 7)

    expect(fast.boomAngle).toBeLessThan(slow.boomAngle)
    expect(slow.boomAngle).toBeCloseTo(slow.apparentWind.angle - 15, 8)
    expect(fast.boomAngle).toBeCloseTo(fast.apparentWind.angle - 15, 8)
  })

  it('uses the class guide near close-hauled and the shroud limit broad', () => {
    const close420 = optimalMainTrim('420', 45, 10, 4)
    const close470 = optimalMainTrim('470', 45, 10, 4)
    const broad420 = optimalMainTrim('420', 150, 18, 6)
    const broad470 = optimalMainTrim('470', 150, 18, 6)

    expect(close420.mode).toBe('class-guide')
    expect(close470.mode).toBe('class-guide')
    expect(close420.boomAngle).toBeLessThanOrEqual(2)
    expect(close470.boomAngle).toBeLessThanOrEqual(2)
    expect(broad420.mode).toBe('shroud-limit')
    expect(broad470.mode).toBe('shroud-limit')
    expect(broad420.boomAngle).toBe(78)
    expect(broad470.boomAngle).toBe(80)
  })

  it('opens the boom continuously as the boat bears away', () => {
    for (const boat of ['420', '470'] as const) {
      const angles = [40, 45, 55, 60, 70, 80, 90, 110, 125, 140, 150]
        .map((trueWindAngle) => optimalMainTrim(boat, trueWindAngle, 12, 5).boomAngle)

      for (let index = 1; index < angles.length; index += 1) {
        expect(angles[index]).toBeGreaterThanOrEqual(angles[index - 1])
      }
    }
  })
})
