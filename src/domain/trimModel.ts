import { BOATS } from '../data/boats'
import type {
  BoatClass,
  ControlKey,
  Guidance,
  SailPair,
  TrimControls,
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
  chock: '厚くするほどロワーマストの前後移動を抑え、メイン下部の曲がりと深さに影響します。',
  jibHeight: '高さを変えるとシートの引く向きが変わり、ジブのツイストと下部の深さが変わります。',
  windwardSheet: '引くほどジブを内側へ寄せます。クローズでは有効ですが、ベア後はスロットを狭めます。',
  forePuller: 'ロワーマストを前へ導き、マストベンドとメインの深さを変えます。艤装差は艇の動きで確認します。',
  aftPuller: 'ロワーマストを後ろへ導き、フォアプラーと反対方向にマスト形状を変えます。',
  jibLeadForeAft: '前へ出すほどジブ上部を強く引き、リーチのツイストを減らします。',
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

  return {
    mainSheet: Math.round(lerp(88, 16, course)),
    jibSheet: Math.round(lerp(84, 19, course)),
    vang: Math.round(clamp(lerp(43, 54, inverseLerp(42, 92, trueWindAngle)) - broad * 18 + breeze * 21, 18, 82)),
    cunningham: Math.round(lerp(8, 72, breeze) * lerp(1, 0.45, broad)),
    outhaul: Math.round(clamp(lerp(72, 25, course) + breeze * 15, 18, 91)),
    crewHike: Math.round(clamp(lerp(12, 96, breeze) * lerp(1, 0.34, broad), 5, 96)),
    crewForeAft: Math.round(clamp(48 + broad * 15 - (1 - breeze) * 5, 30, 70)),
    centerboard: Math.round(lerp(96, 38, course) - breeze * broad * 7),
    chock: Math.round(boat === '420' ? lerp(62, 38, breeze) : 50),
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
  const mastBend =
    boat === '420'
      ? clamp(0.72 - controls.chock / 180, 0.12, 0.72)
      : clamp(0.42 + controls.forePuller / 210 - controls.aftPuller / 250, 0.12, 0.82)
  const mainDepth = clamp(
    0.188 - controls.outhaul * 0.00072 - controls.cunningham * 0.00018 - mastBend * 0.034 + windLoad * 0.01,
    0.075,
    0.17,
  )
  const mainDraftPosition = clamp(
    0.515 - controls.cunningham * 0.00125 - mastBend * 0.018 + windLoad * 0.018,
    0.36,
    0.52,
  )
  const mainTwist = clamp(25 - controls.vang * 0.135 - controls.mainSheet * 0.065 + windLoad * 2.5, 3, 24)
  const mainAngle = clamp(80 - controls.mainSheet * 0.72, 7, 80)

  const jibLeadClosure =
    boat === '420'
      ? controls.jibHeight * 0.055 + controls.windwardSheet * 0.03
      : controls.jibLeadForeAft * 0.06
  const jibDepth = clamp(
    0.161 - controls.jibSheet * 0.00022 + (50 - jibLeadClosure * 8) * 0.00012 + windLoad * 0.006,
    0.09,
    0.16,
  )
  const jibDraftPosition = clamp(0.46 - controls.jibSheet * 0.00035 + windLoad * 0.012, 0.39, 0.49)
  const jibTwist = clamp(25 - controls.jibSheet * 0.07 - jibLeadClosure + windLoad * 1.8, 4, 24)
  const inboard = boat === '420' ? controls.windwardSheet : controls.jibLeadInOut
  const jibAngle = clamp(69 - controls.jibSheet * 0.57 - inboard * 0.12, 5, 70)

  return {
    main: {
      angle: mainAngle,
      draftDepth: mainDepth,
      draftPosition: mainDraftPosition,
      twist: mainTwist,
    },
    jib: {
      angle: jibAngle,
      draftDepth: jibDepth,
      draftPosition: jibDraftPosition,
      twist: jibTwist,
    },
  }
}

type WeightedControl = { key: ControlKey; weight: number; tolerance: number }

const BASE_WEIGHTS: WeightedControl[] = [
  { key: 'mainSheet', weight: 1.8, tolerance: 8 },
  { key: 'jibSheet', weight: 1.55, tolerance: 9 },
  { key: 'vang', weight: 0.8, tolerance: 13 },
  { key: 'cunningham', weight: 0.45, tolerance: 18 },
  { key: 'outhaul', weight: 0.55, tolerance: 16 },
  { key: 'crewHike', weight: 1.05, tolerance: 14 },
  { key: 'crewForeAft', weight: 0.22, tolerance: 20 },
  { key: 'centerboard', weight: 0.65, tolerance: 15 },
]

const CLASS_WEIGHTS: Record<BoatClass, WeightedControl[]> = {
  '420': [
    { key: 'chock', weight: 0.22, tolerance: 20 },
    { key: 'jibHeight', weight: 0.25, tolerance: 18 },
    { key: 'windwardSheet', weight: 0.34, tolerance: 16 },
  ],
  '470': [
    { key: 'forePuller', weight: 0.18, tolerance: 22 },
    { key: 'aftPuller', weight: 0.18, tolerance: 22 },
    { key: 'jibLeadForeAft', weight: 0.26, tolerance: 18 },
    { key: 'jibLeadInOut', weight: 0.32, tolerance: 17 },
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

function metrics(
  boat: BoatClass,
  trueWindAngle: number,
  windSpeed: number,
  controls: TrimControls,
  target: TrimControls,
): TrimMetrics {
  const errors = controlErrors(boat, controls, target)
  const totalWeight = errors.reduce((sum, item) => sum + item.weight, 0)
  const penalty = errors.reduce(
    (sum, item) => sum + Math.min(2.4, item.severity ** 1.45) * item.weight,
    0,
  ) / totalWeight
  const efficiency = clamp(100 - penalty * 23, 34, 100)
  const angleRad = (trueWindAngle * Math.PI) / 180
  const coursePower = clamp(0.44 + Math.sin(angleRad) * 0.24, 0.43, 0.69)
  const speed = clamp(
    windSpeed * coursePower * BOATS[boat].hullSpeedFactor * (0.55 + efficiency / 220),
    0,
    boat === '470' ? 7.8 : 7.2,
  )
  const lateralDemand = Math.max(0.12, Math.cos((Math.min(trueWindAngle, 150) * Math.PI) / 360))
  const sheetOvertrim =
    Math.max(0, controls.mainSheet - target.mainSheet) * 0.09 +
    Math.max(0, controls.jibSheet - target.jibSheet) * 0.06
  const righting = 0.42 + controls.crewHike / 120
  const heel = clamp((windSpeed * lateralDemand * 1.15 + sheetOvertrim) / righting - 3.5, 0, 28)
  const boardSupport = 0.35 + controls.centerboard / 100
  const leeway = clamp((windSpeed * lateralDemand * 0.53) / boardSupport + sheetOvertrim * 0.14, 0.8, 11)
  const balance = clamp(100 - Math.abs(heel - (windSpeed > 8 ? 5 : 3)) * 3.1 - Math.abs(controls.crewForeAft - target.crewForeAft) * 0.5, 30, 100)

  return {
    efficiency,
    speed,
    heel,
    leeway,
    drive: clamp(efficiency * coursePower * 1.32, 25, 100),
    balance,
  }
}

function guidance(
  boat: BoatClass,
  controls: TrimControls,
  target: TrimControls,
  efficiency: number,
): Guidance {
  const errors = controlErrors(boat, controls, target).sort(
    (a, b) => b.severity * b.weight - a.severity * a.weight,
  )
  const biggest = errors[0]

  if (efficiency >= 93) {
    return {
      tone: 'good',
      label: 'IN THE GROOVE',
      title: '形とバランスが適正範囲です',
      explanation: '速い一点ではなく、波や風の変化に対応できる幅を残したトリムです。テルテールの流れを保ってください。',
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
  const actual = sailShapes(boat, controls, windSpeed)
  const target = sailShapes(boat, targets, windSpeed)
  const trimMetrics = metrics(boat, trueWindAngle, windSpeed, controls, targets)
  const apparent = apparentWind(trueWindAngle, windSpeed, trimMetrics.speed)

  return {
    actual,
    target,
    targetControls: targets,
    metrics: trimMetrics,
    guidance: guidance(boat, controls, targets, trimMetrics.efficiency),
    apparentWindAngle: apparent.angle,
    apparentWindSpeed: apparent.speed,
  }
}

export const helpers = { clamp, courseBlend }
