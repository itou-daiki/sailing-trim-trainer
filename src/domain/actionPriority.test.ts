import { describe, expect, it } from 'vitest'
import { actionPriority, keepActionPriority } from './actionPriority'
import type { ControlKey, TrimAction } from './types'

function action(control: ControlKey, gain: number): TrimAction {
  return {
    control,
    direction: '引く',
    reason: 'test',
    delta: 10,
    gain,
    urgency: 'small',
  }
}

describe('stable adjustment priority', () => {
  it('does not reshuffle remaining controls while their live gains change', () => {
    const established = actionPriority([
      action('vang', 8),
      action('cunningham', 5),
      action('outhaul', 3),
    ])
    const recalculated = [
      action('outhaul', 9),
      action('cunningham', 7),
      action('vang', 1),
    ]

    expect(keepActionPriority(recalculated, established).map(({ control }) => control))
      .toEqual(['vang', 'cunningham', 'outhaul'])
  })

  it('removes completed controls without inserting a new rank mid-sequence', () => {
    const established: ControlKey[] = ['vang', 'cunningham', 'outhaul']
    const recalculated = [
      action('jibHeight', 11),
      action('outhaul', 4),
      action('cunningham', 2),
    ]

    expect(keepActionPriority(recalculated, established).map(({ control }) => control))
      .toEqual(['cunningham', 'outhaul'])
  })

  it('uses the live order to start a sequence when no priority is established', () => {
    const recalculated = [action('jibHeight', 11), action('outhaul', 4)]

    expect(keepActionPriority(recalculated, []).map(({ control }) => control))
      .toEqual(['jibHeight', 'outhaul'])
  })
})
