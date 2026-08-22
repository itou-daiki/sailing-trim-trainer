import type { BoatClass, ControlKey } from '../domain/types'

export type BoatProfile = {
  id: BoatClass
  name: string
  crew: string
  hullSpeedFactor: number
  note: string
  advancedControls: ControlKey[]
}

export const BOATS: Record<BoatClass, BoatProfile> = {
  '420': {
    id: '420',
    name: 'International 420',
    crew: '2人乗り・ユース／大学セーリング',
    hullSpeedFactor: 0.96,
    note: 'チョックでロワーマストの曲がりを抑え、ジブ高さと風上シートでリード角を作ります。',
    advancedControls: ['chock', 'jibHeight', 'windwardSheet'],
  },
  '470': {
    id: '470',
    name: 'International 470',
    crew: '2人乗り・ハイパフォーマンス',
    hullSpeedFactor: 1.04,
    note: 'フォア／アフタープラーは、金具の名前ではなくロワーマストがどちらへ動いたかで理解します。',
    advancedControls: [
      'forePuller',
      'aftPuller',
      'jibLeadForeAft',
      'jibLeadInOut',
    ],
  },
}
