import { BOATS } from '../data/boats'
import { evaluateAero } from './aeroModel'
import type {
  BoatClass,
  ControlKey,
  Guidance,
  SailPair,
  TrimControls,
  TrimAction,
  TrimMetrics,
  TrimResult,
} from './types'

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const lerp = (start: number, end: number, amount: number) =>
  start + (end - start) * amount

const inverseLerp = (start: number, end: number, value: number) =>
  clamp((value - start) / (end - start), 0, 1)

const courseBlend = (twa: number) => inverseLerp(42, 145, twa)

export const CONTROL_LABELS: Record<ControlKey, string> = {
  mainSheet: 'メインシート',
  jibSheet: 'ジブシート',
  vang: 'バング',
  cunningham: 'カニンガム',
  outhaul: 'アウトホール',
  crewHike: 'ハイクアウト',
  crewForeAft: '前後バランス',
  centerboard: 'センターボード',
  chock: 'チョック',
  jibHeight: 'ジブ高さ',
  windwardSheet: '風上ジブシート',
  forePuller: 'フォアプラー',
  aftPuller: 'アフタープラー',
  jibLeadForeAft: 'ジブリード前後',
  jibLeadInOut: 'ジブリード内外',
}

export const CONTROL_EFFECTS: Record<ControlKey, string> = {
  mainSheet: '引くほどメインの迎角が増え、上部リーチも閉じます。出すと風下へ開きます。',
  jibSheet: '引くほどジブの迎角が増え、リーチが閉じます。引きすぎると裏風と失速を招きます。',
  vang: '引くほどブームの浮き上がりを抑え、上部のツイストを減らします。',
  cunningham: '引くほどラフに張力がかかり、ドラフトのいちばん深い位置が前へ戻ります。',
  outhaul: '引くほどメイン下部がフラットになります。出すと下部のドラフトが深くなります。',
  crewHike: '外へ出るほど復原力が増え、艇をフラットに保ちやすくなります。',
  crewForeAft: '前後の位置で船体の濡れ方が変わります。弱風では動きを小さくします。',
  centerboard: '下げるほど横流れを抑えます。ベアすると上げて余分な抵抗を減らします。',
  chock: '厚くするほどバングによるロワーマストの曲がりを抑え、メイン下部の深さを保ちます。',
  jibHeight: '高くするほどシートがクリューを下へ引き、ジブ上部のツイストを減らして下部を深くします。',
  windwardSheet: '引くほどジブを内側へ寄せます。クローズでは有効ですが、ベア後はスロットを狭めます。',
  forePuller: 'ロワーマストを前へ導き、前後方向のベンドを増やしてメイン中〜下部をフラットにします。',
  aftPuller: 'ロワーマストを後ろへ導き、フォアプラーと反対にベンドを戻してメイン中〜下部の深さを増やします。',
  jibLeadForeAft: '前へ出すほどジブのクリューを下へ引き、上部ツイストを減らして下部を深くします。',
  jibLeadInOut: '内へ寄せるほどジブの角度が小さくなります。上り角度とスロットの余裕の交換です。',
}

export const defaultControls: TrimControls = {
  mainSheet: 70,
  jibSheet: 68,
  vang: 45,
  cunningham: 24,
  outhaul: 62,
  crewHike: 45,
  crewForeAft: 50,
  centerboard: 90,
  chock: 50,
  jibHeight: 48,
  windwardSheet: 30,
  forePuller: 42,
  aftPuller: 32,
  jibLeadForeAft: 55,
  jibLeadInOut: 58,
}

export function targetControls(
  boat: BoatClass,
  trueWindAngle: number,
  windSpeed: number,
): TrimControls {
  const course = courseBlend(trueWindAngle)
  const breeze = inverseLerp(4, 18, windSpeed)
  const broad = inverseLerp(105, 155, trueWindAngle)
  const powered = inverseLerp(8, 18, windSpeed)
  const overpowered = inverseLerp(10, 18, windSpeed)
  const targetVang = clamp(
    10 + inverseLerp(42, 100, trueWindAngle) * 20 - broad * 10 + overpowered * 58,
    8,
    82,
  )
  const targetOuthaul = clamp(58 + powered * 32 - course * 25, 20, 92)

  return {
    mainSheet: Math.round(lerp(88, 16, course)),
    jibSheet: Math.round(lerp(84, 19, course)),
    vang: Math.round(targetVang),
    cunningham: Math.round(lerp(4, 78, overpowered) * lerp(1, 0.38, broad)),
    outhaul: Math.round(targetOuthaul),
    crewHike: Math.round(clamp(lerp(12, 96, breeze) * lerp(1, 0.34, broad), 5, 96)),
    crewForeAft: Math.round(clamp(48 + broad * 15 - (1 - breeze) * 5, 30, 70)),
    centerboard: Math.round(lerp(96, 38, course) - breeze * broad * 7),
    chock: Math.round(boat === '420' ? clamp(10 + targetVang * 0.8, 16, 76) : 50),
    jibHeight: Math.round(boat === '420' ? lerp(60, 38, breeze) : 50),
    windwardSheet: Math.round(boat === '420' ? lerp(46, 2, course) : 0),
    forePuller: Math.round(boat === '470' ? lerp(38, 65, breeze) : 50),
    aftPuller: Math.round(boat === '470' ? lerp(42, 24, breeze) : 50),
    jibLeadForeAft: Math.round(boat === '470' ? clamp(62 - course * 28 - breeze * 7, 24, 68) : 50),
    jibLeadInOut: Math.round(boat === '470' ? lerp(65, 20, course) : 50),
  }
}

function sailShapes(
  boat: BoatClass,
  controls: TrimControls,
  windSpeed: number,
): SailPair {
  const windLoad = inverseLerp(4, 18, windSpeed)
  const vang = controls.vang / 100
  const cunningham = controls.cunningham / 100
  const outhaul = controls.outhaul / 100
  const sheet = controls.mainSheet / 100
  const chock = controls.chock / 100
  const forePuller = controls.forePuller / 100
  const aftPuller = controls.aftPuller / 100

  const bend = boat === '420'
    ? {
        lower: clamp(0.38 + vang * 0.2 - chock * 0.5, 0.08, 0.78),
        middle: clamp(0.4 + vang * 0.34 - chock * 0.3, 0.12, 0.86),
        upper: clamp(0.38 + vang * 0.42 - chock * 0.06, 0.16, 0.9),
      }
    : {
        lower: clamp(0.34 + forePuller * 0.45 - aftPuller * 0.35 + vang * 0.16, 0.08, 0.9),
        middle: clamp(0.36 + forePuller * 0.34 - aftPuller * 0.25 + vang * 0.28, 0.1, 0.92),
        upper: clamp(0.36 + forePuller * 0.14 - aftPuller * 0.09 + vang * 0.42, 0.16, 0.94),
      }

  const mainSections = {
    lower: {
      height: 0.25,
      draftDepth: clamp(
        0.165 - (outhaul - 0.5) * 0.065 - bend.lower * 0.05 - cunningham * 0.01 + windLoad * 0.007,
        0.075,
        0.19,
      ),
      draftPosition: clamp(
        0.47 - cunningham * 0.055 - bend.lower * 0.012 + windLoad * 0.018,
        0.36,
        0.52,
      ),
      twist: clamp(1.8 - vang * 1.2 + bend.lower * 0.6, 0.3, 4),
    },
    middle: {
      height: 0.5,
      draftDepth: clamp(
        0.145 - (outhaul - 0.5) * 0.02 - bend.middle * 0.065 - cunningham * 0.009 + windLoad * 0.01,
        0.07,
        0.17,
      ),
      draftPosition: clamp(
        0.46 - cunningham * 0.07 - bend.middle * 0.014 + windLoad * 0.02,
        0.35,
        0.52,
      ),
      twist: clamp(10 - vang * 6.5 - sheet * 1.5 + bend.middle * 2 + cunningham * 0.8, 2, 13),
    },
    upper: {
      height: 0.75,
      draftDepth: clamp(
        0.118 - (outhaul - 0.5) * 0.004 - bend.upper * 0.045 - cunningham * 0.006 + windLoad * 0.012,
        0.06,
        0.145,
      ),
      draftPosition: clamp(
        0.45 - cunningham * 0.08 - bend.upper * 0.016 + windLoad * 0.022,
        0.34,
        0.51,
      ),
      twist: clamp(20 - vang * 14 - sheet * 3 + bend.upper * 4.5 + cunningham * 2 + windLoad * 1.5, 4, 24),
    },
  }
  const mainAngle = clamp(80 - controls.mainSheet * 0.72, 7, 80)

  const jibLeadClosure = clamp(
    boat === '420'
      ? controls.jibHeight / 100
      : controls.jibLeadForeAft / 100,
    0,
    1,
  )
  const jibSheet = controls.jibSheet / 100
  const jibSections = {
    lower: {
      height: 0.25,
      draftDepth: clamp(0.148 + (jibLeadClosure - 0.5) * 0.02 - jibSheet * 0.006 + windLoad * 0.006, 0.1, 0.175),
      draftPosition: clamp(0.465 - jibLeadClosure * 0.008 - jibSheet * 0.006 + windLoad * 0.012, 0.39, 0.5),
      twist: clamp(2 - jibLeadClosure * 0.8, 0.6, 3),
    },
    middle: {
      height: 0.5,
      draftDepth: clamp(0.14 + (jibLeadClosure - 0.5) * 0.012 - jibSheet * 0.005 + windLoad * 0.007, 0.095, 0.165),
      draftPosition: clamp(0.455 - jibLeadClosure * 0.006 - jibSheet * 0.005 + windLoad * 0.013, 0.385, 0.495),
      twist: clamp(10 - jibLeadClosure * 5 - jibSheet * 0.7 + windLoad * 0.8, 3, 12),
    },
    upper: {
      height: 0.75,
      draftDepth: clamp(0.124 + (jibLeadClosure - 0.5) * 0.004 - jibSheet * 0.004 + windLoad * 0.008, 0.085, 0.15),
      draftPosition: clamp(0.445 - jibLeadClosure * 0.004 - jibSheet * 0.004 + windLoad * 0.014, 0.38, 0.49),
      twist: clamp(21 - jibLeadClosure * 11 - jibSheet * 1.2 + windLoad * 1.2, 5, 23),
    },
  }
  const inboard = boat === '420' ? controls.windwardSheet : controls.jibLeadInOut
  const jibAngle = clamp(69 - controls.jibSheet * 0.57 - inboard * 0.12, 5, 70)
  const mastBend = clamp(0.008 + bend.middle * 0.072, 0.012, 0.078)

  return {
    main: {
      angle: mainAngle,
      mastBend,
      draftDepth: mainSections.middle.draftDepth,
      draftPosition: mainSections.middle.draftPosition,
      twist: mainSections.upper.twist,
      sections: mainSections,
    },
    jib: {
      angle: jibAngle,
      mastBend: 0,
      draftDepth: jibSections.middle.draftDepth,
      draftPosition: jibSections.middle.draftPosition,
      twist: jibSections.upper.twist,
      sections: jibSections,
    },
  }
}

type WeightedControl = { key: ControlKey; weight: number; tolerance: number }

const BASE_WEIGHTS: WeightedControl[] = [
  { key: 'vang', weight: 0.95, tolerance: 13 },
  { key: 'cunningham', weight: 0.9, tolerance: 18 },
  { key: 'outhaul', weight: 1, tolerance: 16 },
]

const CLASS_WEIGHTS: Record<BoatClass, WeightedControl[]> = {
  '420': [
    { key: 'chock', weight: 0.72, tolerance: 20 },
    { key: 'jibHeight', weight: 0.76, tolerance: 18 },
  ],
  '470': [
    { key: 'forePuller', weight: 0.68, tolerance: 22 },
    { key: 'aftPuller', weight: 0.68, tolerance: 22 },
    { key: 'jibLeadForeAft', weight: 0.78, tolerance: 18 },
  ],
}

function controlErrors(
  boat: BoatClass,
  controls: TrimControls,
  target: TrimControls,
) {
  return [...BASE_WEIGHTS, ...CLASS_WEIGHTS[boat]].map((item) => ({
    ...item,
    delta: controls[item.key] - target[item.key],
    severity: Math.abs(controls[item.key] - target[item.key]) / item.tolerance,
  }))
}

const ACTION_DIRECTIONS: Record<
  ControlKey,
  { increase: string; decrease: string }
> = {
  mainSheet: { increase: '引く', decrease: '出す' },
  jibSheet: { increase: '引く', decrease: '出す' },
  vang: { increase: '引く', decrease: '出す' },
  cunningham: { increase: '引く', decrease: '出す' },
  outhaul: { increase: '引く', decrease: '出す' },
  crewHike: { increase: '外へ出る', decrease: '内側へ戻る' },
  crewForeAft: { increase: '前へ移動', decrease: '後ろへ移動' },
  centerboard: { increase: '下げる', decrease: '上げる' },
  chock: { increase: '厚くする', decrease: '薄くする' },
  jibHeight: { increase: '高くする', decrease: '低くする' },
  windwardSheet: { increase: '引く', decrease: '出す' },
  forePuller: { increase: '前へ引く', decrease: '緩める' },
  aftPuller: { increase: '後ろへ引く', decrease: '緩める' },
  jibLeadForeAft: { increase: '前へ送る', decrease: '後ろへ送る' },
  jibLeadInOut: { increase: '内へ寄せる', decrease: '外へ出す' },
}

const ACTION_REASONS: Record<ControlKey, string> = {
  mainSheet: 'メインの迎角を先に合わせる',
  jibSheet: 'ジブの迎角とスロットを合わせる',
  vang: '上部リーチのツイストを合わせる',
  cunningham: '最大ドラフト位置を前後に戻す',
  outhaul: 'メイン下部の深さを合わせる',
  crewHike: '艇をフラットへ戻して力を前へ向ける',
  crewForeAft: '船体の濡れ方と抵抗を整える',
  centerboard: '横流れと水中抵抗を合わせる',
  chock: 'ロワーマストの曲がりを合わせる',
  jibHeight: 'ジブのリード角とツイストを合わせる',
  windwardSheet: 'ジブの内寄せとスロットを合わせる',
  forePuller: 'ロワーマストを前後に合わせる',
  aftPuller: 'ロワーマストを前後に合わせる',
  jibLeadForeAft: 'ジブ上部のツイストを合わせる',
  jibLeadInOut: 'ジブ角度とスロットを合わせる',
}

function prioritizedActions(
  boat: BoatClass,
  controls: TrimControls,
  target: TrimControls,
  windSpeed: number,
  trueWindAngle: number,
): TrimAction[] {
  const targetShape = sailShapes(boat, target, windSpeed)
  const currentScore = evaluateAero(
    sailShapes(boat, controls, windSpeed),
    targetShape,
    trueWindAngle,
  ).efficiency

  return controlErrors(boat, controls, target)
    .filter((item) => item.severity >= 0.35)
    .map((item) => {
      const corrected = { ...controls, [item.key]: target[item.key] }
      const correctedScore = evaluateAero(
        sailShapes(boat, corrected, windSpeed),
        targetShape,
        trueWindAngle,
      ).efficiency
      return { ...item, benefit: Math.max(0, correctedScore - currentScore) }
    })
    .sort((a, b) => b.benefit - a.benefit || b.severity * b.weight - a.severity * a.weight)
    .map((item) => ({
      control: item.key,
      direction:
        item.delta < 0
          ? ACTION_DIRECTIONS[item.key].increase
          : ACTION_DIRECTIONS[item.key].decrease,
      reason: ACTION_REASONS[item.key],
      delta: Math.round(Math.abs(item.delta)),
      gain: Math.round(item.benefit * 10) / 10,
      urgency: item.severity >= 1.15 ? 'large' : 'small',
    }))
}

function metrics(
  boat: BoatClass,
  trueWindAngle: number,
  windSpeed: number,
  actualShape: SailPair,
  targetShape: SailPair,
): TrimMetrics {
  const aero = evaluateAero(actualShape, targetShape, trueWindAngle)
  const speedLimit = boat === '470' ? 7.8 : 7.2
  const unboundedSpeed =
    windSpeed *
    0.72 *
    BOATS[boat].hullSpeedFactor *
    Math.sqrt(aero.driveCoefficient)
  const speed = speedLimit * Math.tanh(unboundedSpeed / speedLimit)
  return {
    efficiency: aero.efficiency,
    speed,
    heel: 0,
    leeway: 0,
    drive: aero.driveRatio,
    balance: 100,
    liftCoefficient: aero.liftCoefficient,
    dragCoefficient: aero.dragCoefficient,
    liftToDrag: aero.liftToDrag,
  }
}

export function guidanceForActions(
  boat: BoatClass,
  controls: TrimControls,
  target: TrimControls,
  efficiency: number,
  actions: TrimAction[],
): Guidance {
  const errors = controlErrors(boat, controls, target).sort(
    (a, b) => b.severity * b.weight - a.severity * a.weight,
  )
  const biggest = errors.find((error) => error.key === actions[0]?.control) ?? errors[0]

  if (efficiency >= 97 && actions.length === 0) {
    return {
      tone: 'good',
      label: 'IN THE GROOVE',
      title: 'セール形状が適正範囲です',
      explanation: '深さ・最大深さ位置・ツイストが比較用の範囲へ入りました。艇の姿勢と基本角度は最適に保たれている前提です。',
      action: '次は風速を2 kt上げ、同じ形を作り直してみましょう。',
    }
  }

  const tooMuch = biggest.delta > 0
  const messages: Partial<Record<ControlKey, [string, string, string, string]>> = {
    mainSheet: tooMuch
      ? ['メインが引き込みすぎです', 'ベアした風に対して迎角が大きく、横向きの力とヒールが増えています。', 'メインシートを出す', 'トレーリングエッジが風下へ開き、流れが戻ります。']
      : ['メインが開きすぎです', 'ラフ側から風が入り、メインの前側がつぶれやすい状態です。', 'メインシートを引く', 'ラフのばたつきが止まる直前を探します。'],
    jibSheet: tooMuch
      ? ['ジブが引き込みすぎです', 'ジブのリーチが閉じ、メインとの間の流れに余裕がありません。', 'ジブシートを出す', '風上側テルテールが流れ始める位置まで少しずつ出します。']
      : ['ジブが開きすぎです', 'ジブの迎角が足りず、前側で揚力を作り切れていません。', 'ジブシートを引く', '風下側テルテールが乱れない範囲で引きます。'],
    vang: tooMuch
      ? ['バングが強すぎます', '上部リーチが閉じ、ガストを逃がすツイストが不足しています。', 'バングを出す', '上部の断面が少し開くまで出します。']
      : ['バングが不足しています', 'ブームが浮き、上部が開きすぎて力が逃げています。', 'バングを引く', '上部リーチリボンが止まらない範囲で引きます。'],
    cunningham: tooMuch
      ? ['ラフ張力が強すぎます', 'ドラフトが前へ寄りすぎ、必要な深さまで失われています。', 'カニンガムを出す', 'ドラフト位置を保ちながらシワが少し残る程度へ戻します。']
      : ['ドラフトが後ろへ残っています', '風が強くなるほど最大深さが後退し、舵が重くなりやすくなります。', 'カニンガムを引く', '断面の最大深さが前へ動く様子を見てください。'],
    outhaul: tooMuch
      ? ['メイン下部が平らすぎます', 'この風とコースで使えるパワーまで抜けています。', 'アウトホールを出す', '下部断面の深さが戻るところまで出します。']
      : ['メイン下部が深すぎます', '余分なドラフトが抗力とヒールを増やしています。', 'アウトホールを引く', '下部のふくらみを一段フラットにします。'],
    crewHike: tooMuch
      ? ['艇を起こしすぎています', '必要以上の動きは艇を揺らし、再現性を下げます。', '体重を少し内側へ', '目標ヒールの範囲で小さく動きます。']
      : ['復原力が不足しています', 'ヒールでセールの力が横へ逃げ、舵も重くなります。', '外へ出て艇を起こす', 'トリムを変える前に、まず艇をフラットへ戻します。'],
    centerboard: tooMuch
      ? ['ボードが深すぎます', 'ベアしたコースでは横力が減るため、余分な面積が抵抗になります。', 'センターボードを上げる', '横流れを見ながら少しずつ上げます。']
      : ['ボードが浅すぎます', '横向きの力を受けきれず、リーウェイが増えています。', 'センターボードを下げる', '上りでは横流れを止める面積を確保します。'],
    windwardSheet: tooMuch
      ? ['ジブを内へ寄せすぎです', 'ベア後も風上シートが効き、スロットが狭くなっています。', '風上ジブシートを出す', 'ジブを外へ開き、2枚の間に流れの余裕を作ります。']
      : ['ジブの内寄せが不足しています', 'クローズでジブが外へ残り、上り角度を作りにくい状態です。', '風上ジブシートを引く', '裏風が出ない範囲で少しずつ内へ寄せます。'],
    jibLeadInOut: tooMuch
      ? ['ジブリードが内側すぎます', '狭いスロットでメイン前部の流れが乱れています。', 'ジブリードを外へ', 'メインのラフ付近の乱れが消える位置を探します。']
      : ['ジブリードが外側です', 'クローズでジブの角度が大きく、上りの力を作り切れていません。', 'ジブリードを内へ', '速度を落とさない範囲で一段ずつ内へ動かします。'],
  }

  const message = messages[biggest.key]
  if (message) {
    return {
      tone: biggest.severity > 1.25 ? 'adjust' : 'watch',
      label: biggest.severity > 1.25 ? 'ADJUST FIRST' : 'FINE TUNE',
      title: message[0],
      explanation: message[1],
      action: `${message[2]} — ${message[3]}`,
      control: biggest.key,
    }
  }

  return {
    tone: 'watch',
    label: 'RIG CHECK',
    title: `${CONTROL_LABELS[biggest.key]}を確認`,
    explanation: CONTROL_EFFECTS[biggest.key],
    action: `目標マークへ向けて${tooMuch ? '少し出す／弱める' : '少し引く／強める'}。`,
    control: biggest.key,
  }
}

function apparentWind(trueWindAngle: number, windSpeed: number, boatSpeed: number) {
  const radians = (trueWindAngle * Math.PI) / 180
  const along = windSpeed * Math.cos(radians) + boatSpeed
  const across = windSpeed * Math.sin(radians)
  return {
    angle: (Math.atan2(across, along) * 180) / Math.PI,
    speed: Math.sqrt(along ** 2 + across ** 2),
  }
}

export function calculateTrim(
  boat: BoatClass,
  trueWindAngle: number,
  windSpeed: number,
  controls: TrimControls,
): TrimResult {
  const targets = targetControls(boat, trueWindAngle, windSpeed)
  const shapeControls: TrimControls = {
    ...controls,
    mainSheet: targets.mainSheet,
    jibSheet: targets.jibSheet,
    crewHike: targets.crewHike,
    crewForeAft: targets.crewForeAft,
    centerboard: targets.centerboard,
    windwardSheet: targets.windwardSheet,
    jibLeadInOut: targets.jibLeadInOut,
  }
  const actual = sailShapes(boat, shapeControls, windSpeed)
  const target = sailShapes(boat, targets, windSpeed)
  const trimMetrics = metrics(boat, trueWindAngle, windSpeed, actual, target)
  const apparent = apparentWind(trueWindAngle, windSpeed, trimMetrics.speed)
  const actions = prioritizedActions(
    boat,
    shapeControls,
    targets,
    windSpeed,
    trueWindAngle,
  )

  return {
    actual,
    target,
    targetControls: targets,
    metrics: trimMetrics,
    guidance: guidanceForActions(boat, shapeControls, targets, trimMetrics.efficiency, actions),
    actions,
    apparentWindAngle: apparent.angle,
    apparentWindSpeed: apparent.speed,
  }
}

export const helpers = { clamp, courseBlend }
