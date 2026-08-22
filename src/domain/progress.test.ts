import { describe, expect, it } from 'vitest'
import { EMPTY_PROGRESS, parseProgress, updateRecord } from './progress'

describe('learning progress', () => {
  it('ignores missing, invalid, and unknown-version data', () => {
    expect(parseProgress(null)).toEqual(EMPTY_PROGRESS)
    expect(parseProgress('{broken')).toEqual(EMPTY_PROGRESS)
    expect(parseProgress('{"version":2,"records":{}}')).toEqual(EMPTY_PROGRESS)
  })

  it('updates one challenge without mutating the previous snapshot', () => {
    const next = updateRecord(EMPTY_PROGRESS, 'draft-forward-470', (record) => ({
      ...record,
      attempts: 1,
      completed: true,
      bestMoves: 3,
    }))

    expect(EMPTY_PROGRESS.records).toEqual({})
    expect(next.records['draft-forward-470']).toMatchObject({
      attempts: 1,
      completed: true,
      bestMoves: 3,
    })
  })
})
