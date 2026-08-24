import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { defaultControls } from '../domain/trimModel'
import type { ControlKey, TrimAction } from '../domain/types'
import { ControlPanel } from './ControlPanel'

function action(control: ControlKey, direction = '引く'): TrimAction {
  return {
    control,
    direction,
    reason: 'test',
    delta: 10,
    gain: 3,
    urgency: 'large',
  }
}

function render(actions: TrimAction[], priorityOrder: ControlKey[]) {
  return renderToStaticMarkup(createElement(ControlPanel, {
    boat: '420',
    controls: defaultControls,
    targets: defaultControls,
    actions,
    priorityOrder,
    onControlChangeStart: () => undefined,
    onControlChange: () => undefined,
  }))
}

describe('stable shape-control layout', () => {
  it('keeps every slider in a fixed class order while priorities complete', () => {
    const priorityOrder: ControlKey[] = ['outhaul', 'vang']
    const adjusting = render([action('outhaul'), action('vang')], priorityOrder)
    const completed = render([action('vang')], priorityOrder)
    const labels = ['バング', 'カニンガム', 'アウトホール', 'チョック', 'ジブ高さ']

    for (const markup of [adjusting, completed]) {
      const positions = labels.map((label) => markup.indexOf(`aria-label="${label}"`))
      expect(positions.every((position) => position >= 0)).toBe(true)
      expect(positions).toEqual([...positions].sort((a, b) => a - b))
    }
  })

  it('reserves one same-height priority status row for every slider', () => {
    const priorityOrder: ControlKey[] = ['outhaul', 'vang']
    const adjusting = render([action('outhaul'), action('vang')], priorityOrder)
    const completed = render([action('vang')], priorityOrder)

    expect(adjusting.match(/control-priority/g)).toHaveLength(5)
    expect(completed.match(/control-priority/g)).toHaveLength(5)
    expect(completed).toContain('完了 1')
  })
})
