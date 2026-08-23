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
      predictionConfidence: 'likely',
      evidenceCorrect: true,
    }))

    expect(EMPTY_PROGRESS.records).toEqual({})
    expect(next.records['draft-forward-470']).toMatchObject({
      attempts: 1,
      completed: true,
      bestMoves: 3,
      predictionConfidence: 'likely',
      evidenceCorrect: true,
    })
  })

  it('keeps version-one records from before confidence and evidence were added', () => {
    expect(parseProgress('{"version":1,"records":{"old":{"attempts":2,"completed":false,"assisted":false}}}'))
      .toEqual({
        version: 1,
        records: { old: { attempts: 2, completed: false, assisted: false } },
      })
  })
})
