import type {
  BoatClass,
  ControlKey,
  MastBendProfile,
  TrimControls,
} from './types'

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

type ProfileCoefficients = {
  base: MastBendProfile
  controls: Partial<Record<ControlKey, MastBendProfile>>
  limits: MastBendProfile
}

export const MAST_BEND_ENVELOPE: Record<
  BoatClass,
  { prebendMinimumMm: number; loadedMaximumMm: number }
> = {
  '420': { prebendMinimumMm: 55, loadedMaximumMm: 100 },
  '470': { prebendMinimumMm: 40, loadedMaximumMm: 105 },
}

/**
 * Teaching response matrix for a stayed, tapered International 420/470 rig.
 *
 * The matrix deliberately separates three effects that were previously folded
 * into one mid-mast number:
 * - mainsheet/vang load is strongest in the unsupported upper section;
 * - 420 chocks and 470 pullers chiefly restrain/drive the lower and middle mast;
 * - Cunningham is first a luff-tension control, with a smaller compression
 *   coupling into the existing bend. That coupling is larger in the flexible
 *   470 top section and remains a class/mast-specific teaching approximation.
 *
 * Sources and the limits of this approximation are recorded in
 * docs/product-research-2026-08.md.
 */
const RESPONSE: Record<BoatClass, ProfileCoefficients> = {
  '420': {
    // The standing-rig prebend is read at spreader height (about 30% of the
    // mainsail luff), so the absolute displacement must stay concentrated in
    // the lower/middle mast. Upper controls change curvature without making
    // 75% height the apex of the whole spar.
    base: { lower: 0.55, middle: 0.5, upper: 0.25 },
    controls: {
      mainSheet: { lower: 0.04, middle: 0.09, upper: 0.14 },
      vang: { lower: 0.18, middle: 0.24, upper: 0.28 },
      cunningham: { lower: 0.01, middle: 0.03, upper: 0.08 },
      chock: { lower: -0.55, middle: -0.25, upper: -0.04 },
    },
    limits: { lower: 0.92, middle: 0.9, upper: 0.82 },
  },
  '470': {
    base: { lower: 0.38, middle: 0.34, upper: 0.18 },
    controls: {
      mainSheet: { lower: 0.04, middle: 0.09, upper: 0.14 },
      vang: { lower: 0.16, middle: 0.24, upper: 0.28 },
      cunningham: { lower: 0.01, middle: 0.035, upper: 0.1 },
      forePuller: { lower: 0.45, middle: 0.24, upper: 0.08 },
      aftPuller: { lower: -0.35, middle: -0.18, upper: -0.06 },
    },
    limits: { lower: 0.95, middle: 0.92, upper: 0.84 },
  },
}

const LEVELS = ['lower', 'middle', 'upper'] as const

const AEROELASTIC_COMPLIANCE: Record<BoatClass, MastBendProfile> = {
  '420': { lower: 0.07, middle: 0.095, upper: 0.12 },
  '470': { lower: 0.075, middle: 0.11, upper: 0.15 },
}

export function mastControlProfile(
  boat: BoatClass,
  control: ControlKey,
): MastBendProfile {
  return RESPONSE[boat].controls[control] ?? { lower: 0, middle: 0, upper: 0 }
}

export function calculateMastBendProfile(
  boat: BoatClass,
  controls: TrimControls,
): MastBendProfile {
  const specification = RESPONSE[boat]
  const profile = Object.fromEntries(LEVELS.map((level) => {
    const response = Object.entries(specification.controls).reduce(
      (sum, [control, profile]) =>
        sum + profile[level] * controls[control as ControlKey] / 100,
      specification.base[level],
    )
    const minimum = level === 'lower' ? 0.08 : level === 'middle' ? 0.12 : 0.16
    return [level, clamp(response, minimum, specification.limits[level])]
  })) as MastBendProfile
  const envelope = MAST_BEND_ENVELOPE[boat]
  const prebendFloor = envelope.prebendMinimumMm / envelope.loadedMaximumMm
  const maximum = Math.max(profile.lower, profile.middle, profile.upper)
  if (maximum >= prebendFloor) return profile

  const floorAdjustment = prebendFloor - maximum
  return Object.fromEntries(LEVELS.map((level) => [
    level,
    clamp(profile[level] + floorAdjustment, 0, specification.limits[level]),
  ])) as MastBendProfile
}

/**
 * Adds the distributed reaction of the flying mainsail to the control-set
 * mast profile. `sailLoad` is a dimensionless section load proxy calculated
 * from wind pressure, camber and twist. The compliance is intentionally small:
 * controls and standing rig establish the bend, while aerodynamic sail load
 * closes the two-way teaching loop.
 *
 * 470 receives a slightly larger upper response because its tuning guidance
 * distinguishes flexible top sections. This remains a calibrated learning
 * approximation rather than a mast-section FEM solution.
 *
 * Sources:
 * - https://colorcode.northsails.com/sailing/wp-content/uploads/2017/05/470_tuning_guide_e01.pdf
 * - https://sam.ensam.eu/bitstream/handle/10985/12555/Augier-PhysicsofSports.pdf
 */
export function mastProfileUnderSailLoad(
  boat: BoatClass,
  controlProfile: MastBendProfile,
  sailLoad: MastBendProfile,
): MastBendProfile {
  const specification = RESPONSE[boat]
  const compliance = AEROELASTIC_COMPLIANCE[boat]

  return Object.fromEntries(LEVELS.map((level) => [
    level,
    clamp(
      controlProfile[level] + clamp(sailLoad[level], 0, 1.4) * compliance[level],
      0,
      specification.limits[level],
    ),
  ])) as MastBendProfile
}

export function mastBendSignal(boat: BoatClass, profile: MastBendProfile) {
  const envelope = MAST_BEND_ENVELOPE[boat]
  const maximum = Math.max(profile.lower, profile.middle, profile.upper)
  const maximumMillimeters = maximum * envelope.loadedMaximumMm
  const normalized = (
    maximumMillimeters - envelope.prebendMinimumMm
  ) / (
    envelope.loadedMaximumMm - envelope.prebendMinimumMm
  )
  return clamp(0.012 + normalized * (0.078 - 0.012), 0.012, 0.078)
}

export type MastControlExplanation = {
  primary: string
  secondary: string
  caution: string
}

export function mastControlExplanation(
  boat: BoatClass,
  control: ControlKey,
): MastControlExplanation {
  if (control === 'cunningham') {
    return boat === '470'
      ? {
          primary: 'ラフ張力を増やし、後退したドラフトを前へ戻す。',
          secondary: '強く引くと圧縮荷重が既存ベンドへ加わり、柔らかいトップセクションの曲がりが増える。',
          caution: '上部ベンド量はマスト型式と硬さで変わる。470のSuperspar系ガイドを反映した学習用近似。',
        }
      : {
          primary: 'ラフ張力を増やし、風で後退したドラフトを前へ戻す。',
          secondary: '強い張力は既存ベンドを上部側で少し増幅するが、曲げの主操作ではない。',
          caution: '420 M-12ガイドは「風でベンドが増えるのに合わせて引く」と説明。主な曲げはメインシート／バングとチョックの組合せ。',
        }
  }

  if (control === 'vang') {
    return {
      primary: 'ブームの浮き上がりとリーチ張力を制御する。',
      secondary: 'ブームとリーチからの荷重で、とくに中〜上部のベンドが増える。',
      caution: boat === '420'
        ? 'チョックがロワーマストの過剰な曲がりを支える。'
        : 'プラー設定と合わせて、下部の深さを失いすぎないように読む。',
    }
  }

  if (control === 'chock') {
    return {
      primary: 'デッキ位置でロワーマストを支える。',
      secondary: '厚くするほど下〜中部の前方ベンドを抑え、メイン下部の深さを保つ。',
      caution: '420固有の表示。上部ベンドへの直接作用は小さい。',
    }
  }

  if (control === 'forePuller' || control === 'aftPuller') {
    const forward = control === 'forePuller'
    return {
      primary: forward ? 'ロワーマストを前へ導く。' : 'ロワーマストを後ろへ戻す。',
      secondary: forward
        ? '下〜中部のベンドを増やし、その高さのメインをフラットにする。'
        : '下〜中部のベンドを減らし、その高さのメインへ深さを戻す。',
      caution: '470のプラーはスプレッダー位置付近の変位を基準に読む。',
    }
  }

  if (control === 'mainSheet') {
    return {
      primary: 'ブーム角とリーチ張力を決める。',
      secondary: 'クローズで強く引くほどリーチ荷重がマストトップへ伝わり、上部ベンドが増える。',
      caution: '本アプリではセール角を自動最適化するため、条件変更に伴う背景荷重として扱う。',
    }
  }

  return {
    primary: 'この操作は主にセールまたはリード位置を変える。',
    secondary: 'マスト前後ベンドへの直接作用はモデル化していない。',
    caution: '変化が見える場合は、同時に変わったバング・シート・プラー設定を確認する。',
  }
}
