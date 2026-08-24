import { mastBendMillimeters } from './sailGeometry'
import type { BoatClass, TrimControls } from './types'

export type ClothTraceKind = 'speed' | 'luff-slack' | 'overbend'

export type ClothTrace = {
  id: string
  kind: ClothTraceKind
  severity: number
  points: Array<{ height: number; u: number }>
}

export type MainClothState = {
  status: 'clean' | ClothTraceKind
  tone: 'good' | 'watch'
  label: string
  explanation: string
  mastBendMm: number
  targetMastBendMm: number
  traces: ClothTrace[]
}

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value))

function horizontalTrace(
  id: string,
  kind: 'speed' | 'luff-slack',
  height: number,
  severity: number,
  phase: number,
): ClothTrace {
  const endU = 0.13 + severity * (kind === 'speed' ? 0.1 : 0.19)
  const points = Array.from({ length: 17 }, (_, index) => {
    const amount = index / 16
    const envelope = Math.sin(amount * Math.PI)
    return {
      u: 0.012 + (endU - 0.012) * amount,
      height:
        height +
        Math.sin(amount * Math.PI * 2.25 + phase) *
          (0.004 + severity * 0.009) *
          envelope,
    }
  })
  return { id, kind, severity, points }
}

function overbendTrace(
  id: string,
  startHeight: number,
  severity: number,
  phase: number,
): ClothTrace {
  const points = Array.from({ length: 21 }, (_, index) => {
    const amount = index / 20
    const envelope = Math.sin(amount * Math.PI)
    return {
      u: 0.015 + amount * (0.43 + severity * 0.27),
      height:
        startHeight - amount * (0.22 + severity * 0.2) +
        Math.sin(amount * Math.PI * 2 + phase) * 0.009 * severity * envelope,
    }
  })
  return { id, kind: 'overbend', severity, points }
}

export function diagnoseMainCloth({
  boat,
  windSpeed,
  controls,
  targetControls,
  mastBend,
  targetMastBend,
}: {
  boat: BoatClass
  windSpeed: number
  controls: TrimControls
  targetControls: TrimControls
  mastBend: number
  targetMastBend: number
}): MainClothState {
  const mastBendMm = mastBendMillimeters(boat, mastBend)
  const targetMastBendMm = mastBendMillimeters(boat, targetMastBend)
  const bendExcess = clamp((mastBendMm - targetMastBendMm - 4) / 24)
  const cunninghamDeficit = clamp(
    (targetControls.cunningham - controls.cunningham - 6) / 38,
  )
  const lightAirSpeedWrinkles = windSpeed <= 9
    ? clamp((42 - controls.cunningham) / 42) * clamp((10 - windSpeed) / 7, 0.35, 1)
    : 0

  if (bendExcess >= 0.14) {
    const traces = [0.72, 0.61, 0.5]
      .slice(0, 2 + Math.round(bendExcess))
      .map((height, index) =>
        overbendTrace(`overbend-${index}`, height, bendExcess, index * 0.8),
      )
    return {
      status: 'overbend',
      tone: 'watch',
      label: '斜めのオーバーベンドジワ',
      explanation: 'ラフからクリュー方向へ斜めに走る線。カニンガムだけでは消えず、マストベンド過多を先に疑います。',
      mastBendMm,
      targetMastBendMm,
      traces,
    }
  }

  if (cunninghamDeficit >= 0.16) {
    const traces = [0.17, 0.27, 0.38, 0.49]
      .slice(0, 3 + Math.round(cunninghamDeficit))
      .map((height, index) =>
        horizontalTrace(`luff-slack-${index}`, 'luff-slack', height, cunninghamDeficit, index * 1.1),
      )
    return {
      status: 'luff-slack',
      tone: 'watch',
      label: 'ラフ張力不足の横ジワ',
      explanation: '基準より強く・長く残る横ジワ。ドラフト後退と合わせてカニンガム不足を読みます。',
      mastBendMm,
      targetMastBendMm,
      traces,
    }
  }

  if (lightAirSpeedWrinkles >= 0.13) {
    const traces = [0.19, 0.31, 0.43]
      .slice(0, 2 + Math.round(lightAirSpeedWrinkles))
      .map((height, index) =>
        horizontalTrace(`speed-${index}`, 'speed', height, lightAirSpeedWrinkles, index * 1.25),
      )
    return {
      status: 'speed',
      tone: 'good',
      label: '軽風のスピードリンクル',
      explanation: '420の軽風基準で意図的に残す短い横ジワ。これだけを見て張力不足と決めつけません。',
      mastBendMm,
      targetMastBendMm,
      traces,
    }
  }

  return {
    status: 'clean',
    tone: 'good',
    label: '大きなシワなし',
    explanation: 'ドラフトストライプがラフから滑らかにつながる状態です。深さ・最大位置・ツイストも併せて判断します。',
    mastBendMm,
    targetMastBendMm,
    traces: [],
  }
}
