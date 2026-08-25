import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { calculateTrim, targetControls } from '../domain/trimModel'
import type { ControlMove, ShapeFocus } from '../domain/shapeComparison'
import { BoatView } from './BoatView'

function renderBoatView(move?: ControlMove, focus?: ShapeFocus) {
  const baseline = targetControls('420', 90, 12)
  const beforeControls = { ...baseline, vang: 20 }
  const afterControls = { ...baseline, vang: 80 }
  const before = calculateTrim('420', 90, 12, beforeControls)
  const after = calculateTrim('420', 90, 12, afterControls)

  return renderToStaticMarkup(createElement(BoatView, {
    boat: '420',
    angle: 90,
    windSpeed: 12,
    controls: afterControls,
    result: after,
    previousResult: before,
    courseNotice: '一本動かすと比較できます。',
    focusControl: focus?.sail === 'main' && focus.level === 'upper' ? 'vang' : 'cunningham',
    comparisonMode: move ? 'previous' : 'target',
    hasPrevious: Boolean(move),
    lastMove: move,
    shareStatus: '',
    onComparisonModeChange: () => undefined,
    onShareShape: () => undefined,
  }))
}

describe('teaching-oriented before and after comparison', () => {
  it('puts the fixed pre-trim section beside the live post-trim section', () => {
    const markup = renderBoatView(
      { control: 'vang', from: 20, to: 80 },
      { sail: 'main', level: 'upper' },
    )

    expect(markup).toContain('CHANGE TRACE / 操作前後')
    expect(markup).toContain('BEFORE / 操作前')
    expect(markup).toContain('AFTER / 操作後')
    expect(markup).toContain('バングで、メイン・上部 75%はどう変わった？')
    expect(markup).toContain('左は操作開始時のまま固定')
    expect(markup).toContain('バング 20')
    expect(markup).toContain('バング 80')
    expect(markup).toContain('ツイストの変化')
  })

  it('shows the measured target comparison before the first control move', () => {
    const markup = renderBoatView()

    expect(markup).toContain('MEASURED SECTION')
    expect(markup).toContain('一本動かすと比較できます。')
    expect(markup).not.toContain('CHANGE TRACE / 操作前後')
  })
})
