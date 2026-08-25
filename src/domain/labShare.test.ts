import { describe, expect, it } from 'vitest'
import { labSnapshotUrl, parseLabSnapshot } from './labShare'
import { targetControls } from './trimModel'

describe('shape lab sharing', () => {
  it('round-trips a 470 lab condition without simultaneous puller tension', () => {
    const controls = {
      ...targetControls('470', 90, 12),
      vang: 17,
      cunningham: 28,
      outhaul: 39,
      forePuller: 51,
      aftPuller: 62,
      jibLeadForeAft: 73,
    }
    const url = labSnapshotUrl('https://example.com/app/?challenge=x#test', {
      boat: '470',
      angle: 90,
      windSpeed: 12,
      controls,
    })
    const parsed = parseLabSnapshot(new URL(url).search)

    expect(parsed).toMatchObject({ boat: '470', angle: 90, windSpeed: 12 })
    expect(parsed?.controls.vang).toBe(17)
    expect(parsed?.controls.forePuller).toBe(0)
    expect(parsed?.controls.aftPuller).toBe(62)
    expect(parsed?.controls.jibLeadForeAft).toBe(73)
    expect(new URL(url).searchParams.get('forePuller')).toBe('0')
    expect(new URL(url).searchParams.get('aftPuller')).toBe('62')
    expect(url).not.toContain('challenge=')
  })

  it('rejects incomplete or out-of-range shared conditions', () => {
    expect(parseLabSnapshot('?mode=lab&boat=420&twa=45&tws=8')).toBeUndefined()
    expect(parseLabSnapshot('?mode=lab&boat=420&twa=999&tws=8')).toBeUndefined()
  })
})
