import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('workspace tabs', () => {
  it('starts in the free-practice tab without stacking problem scenes below it', () => {
    const markup = renderToStaticMarkup(createElement(App))

    expect(markup).toContain('role="tablist"')
    expect(markup).toContain('role="tab"')
    expect(markup).toContain('id="free-practice-tab" role="tab" aria-controls="free-practice-panel" aria-selected="true"')
    expect(markup).toContain('id="problem-scenes-tab" role="tab" aria-controls="problem-scenes-panel" aria-selected="false"')
    expect(markup).not.toContain('問題場面を選ぶ')
  })
})
