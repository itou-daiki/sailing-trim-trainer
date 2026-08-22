import { describe, expect, it } from 'vitest'
import { calculateTrim, targetControls } from './trimModel'

describe('section-polar performance proxy', () => {
  it('uses the reference shape as the integrated 100-point response', () => {
    for (const boat of ['420', '470'] as const) {
      const controls = targetControls(boat, 90, 12)
      const result = calculateTrim(boat, 90, 12, controls)

      expect(result.metrics.efficiency).toBeCloseTo(100, 8)
      expect(result.metrics.drive).toBeCloseTo(100, 8)
      expect(result.metrics.liftCoefficient).toBeGreaterThan(0)
      expect(result.metrics.dragCoefficient).toBeGreaterThan(0)
      expect(result.metrics.liftToDrag).toBeGreaterThan(1)
    }
  })

  it('converts a large shape error into less drive and less speed', () => {
    const target = targetControls('420', 90, 14)
    const reference = calculateTrim('420', 90, 14, target)
    const distorted = calculateTrim('420', 90, 14, {
      ...target,
      vang: target.vang > 50 ? 0 : 100,
      cunningham: target.cunningham > 50 ? 0 : 100,
      outhaul: target.outhaul > 50 ? 0 : 100,
      chock: target.chock > 50 ? 0 : 100,
      jibHeight: target.jibHeight > 50 ? 0 : 100,
    })

    expect(distorted.metrics.efficiency).toBeLessThan(reference.metrics.efficiency - 8)
    expect(distorted.metrics.drive).toBeLessThan(reference.metrics.drive)
    expect(distorted.metrics.speed).toBeLessThan(reference.metrics.speed)
    expect(distorted.metrics.dragCoefficient).toBeGreaterThan(reference.metrics.dragCoefficient)
  })

  it('raises target speed monotonically with wind until the soft planing limit', () => {
    for (const boat of ['420', '470'] as const) {
      const speeds = [4, 8, 12, 16, 20].map((wind) =>
        calculateTrim(boat, 90, wind, targetControls(boat, 90, wind)).metrics.speed,
      )

      for (let index = 1; index < speeds.length; index += 1) {
        expect(speeds[index]).toBeGreaterThan(speeds[index - 1])
      }
      expect(speeds.at(-1)).toBeLessThan(boat === '470' ? 8.4 : 7.8)
    }
  })

  it('keeps all aerodynamic outputs finite and bounded across the input grid', () => {
    for (const boat of ['420', '470'] as const) {
      for (const angle of [40, 45, 90, 140, 160]) {
        for (const wind of [4, 8, 12, 18, 22]) {
          const target = targetControls(boat, angle, wind)
          for (const controls of [
            target,
            { ...target, vang: 0, cunningham: 100, outhaul: 0, chock: 0, forePuller: 100, aftPuller: 0 },
            { ...target, vang: 100, cunningham: 0, outhaul: 100, chock: 100, forePuller: 0, aftPuller: 100 },
          ]) {
            const { metrics } = calculateTrim(boat, angle, wind, controls)
            for (const value of [
              metrics.efficiency,
              metrics.speed,
              metrics.drive,
              metrics.liftCoefficient,
              metrics.dragCoefficient,
              metrics.liftToDrag,
            ]) {
              expect(Number.isFinite(value)).toBe(true)
              expect(value).toBeGreaterThanOrEqual(0)
            }
            expect(metrics.efficiency).toBeLessThanOrEqual(100)
            expect(metrics.drive).toBeLessThanOrEqual(100)
          }
        }
      }
    }
  })
})
