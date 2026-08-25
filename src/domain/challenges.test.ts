import { describe, expect, it } from 'vitest'
import { buildChallengeSetup, TRIM_CHALLENGES } from './challenges'
import { calculateTrim, targetControls } from './trimModel'

describe('trim challenges', () => {
  it('never starts a 470 drill with both mast pullers tensioned', () => {
    for (const challenge of TRIM_CHALLENGES.filter(({ boat }) => boat === '470')) {
      const { controls } = buildChallengeSetup(challenge)
      expect(
        controls.forePuller > 0 && controls.aftPuller > 0,
        challenge.id,
      ).toBe(false)
    }
  })

  it('provides a staged path and a visible shape-evidence check for every drill', () => {
    expect(TRIM_CHALLENGES.map((challenge) => challenge.stage)).toEqual([
      'foundation', 'foundation', 'foundation',
      'class', 'class', 'class', 'class', 'class',
      'transfer',
      'class', 'class', 'class', 'class', 'transfer', 'class',
    ])

    for (const challenge of TRIM_CHALLENGES) {
      expect(['draftDepth', 'draftPosition', 'twist']).toContain(challenge.evidence.correct)
      expect(challenge.evidence.statement.length).toBeGreaterThan(12)
    }
  })

  it.each(TRIM_CHALLENGES.map((challenge) => [challenge.id, challenge] as const))(
    '%s starts with a visible problem and diagnoses the intended first control',
    (_, challenge) => {
      const setup = buildChallengeSetup(challenge)
      const result = calculateTrim(setup.boat, setup.angle, setup.windSpeed, setup.controls)

      expect(result.metrics.efficiency).toBeLessThan(challenge.threshold)
      expect(result.actions[0]?.control).toBe(challenge.prediction.correctControl)
    },
  )

  it.each(TRIM_CHALLENGES.map((challenge) => [challenge.id, challenge] as const))(
    '%s can be completed by reaching the reference range',
    (_, challenge) => {
      const setup = buildChallengeSetup(challenge)
      const target = targetControls(setup.boat, setup.angle, setup.windSpeed)
      const result = calculateTrim(setup.boat, setup.angle, setup.windSpeed, target)

      expect(result.metrics.efficiency).toBeGreaterThanOrEqual(challenge.threshold)
      expect(result.actions).toHaveLength(0)
    },
  )
})
