import { targetControls } from './trimModel'
import type { BoatClass, ControlKey, TrimControls } from './types'

export type PredictionOption = {
  control: ControlKey
  label: string
  feedback: string
}

export type ChallengeStage = 'foundation' | 'class' | 'transfer'
export type PredictionConfidence = 'guess' | 'likely' | 'certain'
export type ShapeEvidence = 'draftDepth' | 'draftPosition' | 'twist'

export const CHALLENGE_STAGE_LABELS: Record<ChallengeStage, string> = {
  foundation: '基礎',
  class: '艇種別',
  transfer: '応用',
}

export const SHAPE_EVIDENCE_OPTIONS: Array<{
  key: ShapeEvidence
  label: string
  description: string
}> = [
  { key: 'draftDepth', label: '深さ（ふくらみ）', description: '断面のふくらみの大きさ' },
  { key: 'draftPosition', label: '最大位置', description: 'ラフから一番深い点までの位置' },
  { key: 'twist', label: 'ツイスト（上部の開き）', description: '上へ行くほどリーチが開く量' },
]

export type TrimChallenge = {
  id: string
  order: number
  stage: ChallengeStage
  boat: BoatClass
  band: string
  title: string
  question: string
  objective: string
  successCriterion: string
  threshold: number
  moveBudget: number
  setup: {
    angle: number
    windSpeed: number
    sourceAngle?: number
    sourceWindSpeed?: number
    overrides?: Partial<TrimControls>
  }
  prediction: {
    prompt: string
    correctControl: ControlKey
    options: PredictionOption[]
  }
  evidence: {
    correct: ShapeEvidence
    statement: string
  }
  hints: [string, string, string]
}

export type ChallengeSetup = {
  boat: BoatClass
  angle: number
  windSpeed: number
  controls: TrimControls
}

export const TRIM_CHALLENGES: TrimChallenge[] = [
  {
    id: 'draft-forward-470',
    order: 1,
    stage: 'foundation',
    boat: '470',
    band: 'DRAFT POSITION',
    title: '後ろへ動いたドラフト',
    question: '16 ktでラフ張力だけが抜け、最大ドラフト位置が後退。何を引く？',
    objective: 'カニンガムとドラフト位置の因果を、断面の点の移動で説明できる。',
    successCriterion: '最大ドラフト位置を基準帯へ戻し、適合度98%以上にする。',
    threshold: 98,
    moveBudget: 4,
    setup: { angle: 45, windSpeed: 16, overrides: { cunningham: 0 } },
    prediction: {
      prompt: '深さの「位置」を前へ戻す操作は？',
      correctControl: 'cunningham',
      options: [
        { control: 'cunningham', label: 'カニンガムを引く', feedback: 'ラフ張力が増え、最大ドラフト位置が前へ移ります。大きな断面図の点で確認します。' },
        { control: 'outhaul', label: 'アウトホールを引く', feedback: 'アウトホールは主にメイン下部の深さを減らします。位置の主操作ではありません。' },
        { control: 'vang', label: 'バングを引く', feedback: 'バングは上部リーチとツイストの操作です。ドラフト位置とは分けて考えます。' },
      ],
    },
    evidence: { correct: 'draftPosition', statement: '最大深さの点が、リーチ側から基準帯へ前進した。' },
    hints: [
      '中部断面の最大深さ点を見ます。現在の点が基準よりリーチ側です。',
      'ラフに沿う張力を増やすと、最大深さ位置が前へ戻ります。',
      'カニンガムを引き、「位置」の差分が0へ近づくところを探します。',
    ],
  },
  {
    id: 'depth-control-420',
    order: 2,
    stage: 'foundation',
    boat: '420',
    band: 'DRAFT DEPTH',
    title: '深すぎるメイン下部',
    question: '14 ktでメイン下部だけが深すぎる。最初にどこを引く？',
    objective: 'アウトホールとメイン下部の深さを結びつける。',
    successCriterion: '下部断面を基準帯へ戻し、適合度98%以上にする。',
    threshold: 98,
    moveBudget: 4,
    setup: { angle: 45, windSpeed: 14, overrides: { outhaul: 0 } },
    prediction: {
      prompt: '下部のふくらみを直接減らす操作は？',
      correctControl: 'outhaul',
      options: [
        { control: 'outhaul', label: 'アウトホールを引く', feedback: 'クリューを外へ引き、メイン下部をフラットにします。' },
        { control: 'cunningham', label: 'カニンガムを引く', feedback: '最大深さ位置には効きますが、下部の深さの主操作はアウトホールです。' },
        { control: 'vang', label: 'バングを引く', feedback: 'ツイストを閉じる操作で、下部のふくらみを直接減らす操作ではありません。' },
      ],
    },
    evidence: { correct: 'draftDepth', statement: 'メイン下部のふくらみが小さくなり、基準帯へ入った。' },
    hints: [
      '下部の断面だけを選び、基準帯より大きいふくらみを見ます。',
      'クリューを外へ引くコントロールを探します。',
      'アウトホールを引き、深さの差分を0へ近づけます。',
    ],
  },
  {
    id: 'twist-control-420',
    order: 3,
    stage: 'foundation',
    boat: '420',
    band: 'TWIST',
    title: '開きすぎた上部',
    question: 'ビームでバングだけが抜け、メイン上部が開いた。何を引く？',
    objective: 'バングと上部ツイストの因果を、独立した角度図で説明できる。',
    successCriterion: '上部ツイストを基準帯へ戻し、適合度98%以上にする。',
    threshold: 98,
    moveBudget: 4,
    setup: { angle: 90, windSpeed: 10, overrides: { vang: 0 } },
    prediction: {
      prompt: '上部リーチの開きを直接抑える操作は？',
      correctControl: 'vang',
      options: [
        { control: 'vang', label: 'バングを引く', feedback: 'ブームの浮きを抑え、上部のツイストを減らします。' },
        { control: 'outhaul', label: 'アウトホールを引く', feedback: 'アウトホールは下部の深さが中心です。上部角度とは別です。' },
        { control: 'cunningham', label: 'カニンガムを引く', feedback: '最大深さ位置は動きますが、ツイストを直接止めません。' },
      ],
    },
    evidence: { correct: 'twist', statement: 'メイン上部の開きが減り、基準のツイストへ戻った。' },
    hints: [
      '断面の深さではなく、右側のツイスト角度図を見ます。',
      'ブームを下へ押さえる力が不足しています。',
      'バングを引き、上部のオレンジ線を基準帯へ戻します。',
    ],
  },
  {
    id: 'chock-shape-420',
    order: 4,
    stage: 'class',
    boat: '420',
    band: '420 MAST',
    title: '曲がりすぎたロワーマスト',
    question: '420でチョックが薄く、メインが必要以上にフラット。どこを変える？',
    objective: 'チョックとロワーマストの曲がり、メインの深さを結びつける。',
    successCriterion: 'チョックを基準へ戻し、適合度98%以上にする。',
    threshold: 98,
    moveBudget: 4,
    setup: { angle: 45, windSpeed: 12, overrides: { chock: 0 } },
    prediction: {
      prompt: '420のロワーマストの自由な曲がりを抑えるものは？',
      correctControl: 'chock',
      options: [
        { control: 'chock', label: 'チョックを厚くする', feedback: 'ロワーマストの前後移動を抑え、過剰なベンドを減らします。' },
        { control: 'outhaul', label: 'アウトホールを出す', feedback: '深さは戻せますが、原因のロワーマスト設定は残ります。' },
        { control: 'jibHeight', label: 'ジブを高くする', feedback: 'ジブのリード角に効く操作で、メインのマストベンドとは別です。' },
      ],
    },
    evidence: { correct: 'draftDepth', statement: 'ロワーマストの過剰な曲がりが減り、メイン中部に深さが戻った。' },
    hints: [
      'メイン中部の深さと、420固有のマスト操作を結びます。',
      '薄いほどロワーマストが動きやすくなります。',
      'チョックを厚くし、メイン断面が基準帯へ入るところを探します。',
    ],
  },
  {
    id: 'jib-height-420',
    order: 5,
    stage: 'class',
    boat: '420',
    band: '420 JIB SHAPE',
    title: '閉じすぎたジブ上部',
    question: '420でジブ高さが高すぎ、上部ツイストが不足。どこを下げる？',
    objective: 'ジブ高さとシートの引く向き、ジブ上部ツイストを結びつける。',
    successCriterion: 'ジブ高さを基準へ戻し、適合度98%以上にする。',
    threshold: 98,
    moveBudget: 4,
    setup: { angle: 45, windSpeed: 14, overrides: { jibHeight: 100 } },
    prediction: {
      prompt: 'ジブ上部を開くために下げる操作は？',
      correctControl: 'jibHeight',
      options: [
        { control: 'jibHeight', label: 'ジブ高さを下げる', feedback: 'シートの下向き成分を弱め、ジブ上部を開きます。' },
        { control: 'vang', label: 'バングを出す', feedback: 'メインのツイストには効きますが、ジブのリード角は変わりません。' },
        { control: 'chock', label: 'チョックを薄くする', feedback: 'メインのマストベンド操作で、ジブ上部の主操作ではありません。' },
      ],
    },
    evidence: { correct: 'twist', statement: 'ジブ上部が開き、ツイストが基準帯へ戻った。' },
    hints: [
      'JIBを選び、右側のツイスト角度図を見ます。',
      '高くするとシートがより下へ引き、上部が閉じます。',
      'ジブ高さを下げ、上部ツイストの差を0へ近づけます。',
    ],
  },
  {
    id: 'fore-puller-470',
    order: 6,
    stage: 'class',
    boat: '470',
    band: '470 MAST',
    title: '不足したフォアプラー',
    question: '470の強風でフォアプラーが抜け、メインが深い。どこを前へ引く？',
    objective: 'フォアプラー、ロワーマスト、メインの深さを結びつける。',
    successCriterion: 'フォアプラーを基準へ戻し、適合度98%以上にする。',
    threshold: 98,
    moveBudget: 4,
    setup: { angle: 45, windSpeed: 16, overrides: { forePuller: 0 } },
    prediction: {
      prompt: 'ロワーマストを前へ導く操作は？',
      correctControl: 'forePuller',
      options: [
        { control: 'forePuller', label: 'フォアプラーを前へ', feedback: 'ロワーマストを前へ導き、メインの深さを減らします。' },
        { control: 'aftPuller', label: 'アフタープラーを後ろへ', feedback: '逆方向の操作で、メインをさらに深くする側です。' },
        { control: 'cunningham', label: 'カニンガムを引く', feedback: '位置は前へ動きますが、ロワーマスト設定の原因は残ります。' },
      ],
    },
    evidence: { correct: 'draftDepth', statement: 'ロワーマストが前へ導かれ、メイン中部の過剰な深さが減った。' },
    hints: [
      '470固有のロワーマスト操作を見ます。',
      '名前ではなく、マストを前へ動かす方向で選びます。',
      'フォアプラーを前へ引き、メイン中部の深さを基準帯へ戻します。',
    ],
  },
  {
    id: 'aft-puller-470',
    order: 7,
    stage: 'class',
    boat: '470',
    band: '470 MAST',
    title: '効きすぎたアフタープラー',
    question: 'アフタープラーを引きすぎ、メインが深くなった。最初に何を緩める？',
    objective: 'アフタープラーがフォアプラーと反対にマスト形状へ働くことを説明できる。',
    successCriterion: 'アフタープラーを基準へ戻し、適合度98%以上にする。',
    threshold: 98,
    moveBudget: 4,
    setup: { angle: 45, windSpeed: 12, overrides: { aftPuller: 100 } },
    prediction: {
      prompt: 'ロワーマストを後ろへ引く力を弱める操作は？',
      correctControl: 'aftPuller',
      options: [
        { control: 'aftPuller', label: 'アフタープラーを緩める', feedback: '後ろへ引く力を弱め、ロワーマストを基準へ戻します。' },
        { control: 'forePuller', label: 'フォアプラーをさらに引く', feedback: '形は補えますが、まず過剰なアフタープラーを戻す方が原因に近い操作です。' },
        { control: 'outhaul', label: 'アウトホールを引く', feedback: '深さは減りますが、マスト設定の原因は残ります。' },
      ],
    },
    evidence: { correct: 'draftDepth', statement: 'ロワーマストを後ろへ引く力が減り、メイン中部が基準の深さへ戻った。' },
    hints: [
      'フォア／アフターは名前より、ロワーマストが動く向きを見ます。',
      '今回は「後ろへ」の力が強すぎます。',
      'アフタープラーを緩め、メイン中部の深さを基準帯へ戻します。',
    ],
  },
  {
    id: 'jib-lead-470',
    order: 8,
    stage: 'class',
    boat: '470',
    band: '470 JIB SHAPE',
    title: '開きすぎたジブ上部',
    question: 'ジブリードが後ろすぎ、ジブ上部が開いた。どこを前へ送る？',
    objective: '470のジブリード前後位置とジブ上部ツイストを結びつける。',
    successCriterion: 'ジブリード前後を基準へ戻し、適合度98%以上にする。',
    threshold: 98,
    moveBudget: 4,
    setup: { angle: 45, windSpeed: 15, overrides: { jibLeadForeAft: 0 } },
    prediction: {
      prompt: 'ジブ上部を閉じるために前へ送る操作は？',
      correctControl: 'jibLeadForeAft',
      options: [
        { control: 'jibLeadForeAft', label: 'ジブリードを前へ', feedback: 'シートの下向き成分が増え、ジブ上部のツイストを減らします。' },
        { control: 'forePuller', label: 'フォアプラーを前へ', feedback: 'メインのマスト形状には効きますが、ジブのリード角は変わりません。' },
        { control: 'vang', label: 'バングを引く', feedback: 'メインのツイスト操作で、ジブ上部には直接効きません。' },
      ],
    },
    evidence: { correct: 'twist', statement: 'ジブ上部の開きが減り、ツイストが基準帯へ戻った。' },
    hints: [
      'JIBを選び、上部のツイスト角度を見ます。',
      'リードを前へ送ると、シートがジブをより下へ引きます。',
      'ジブリード前後を前へ動かし、上部角度を基準帯へ戻します。',
    ],
  },
  {
    id: 'broad-shape-470',
    order: 9,
    stage: 'transfer',
    boat: '470',
    band: 'TRANSFER',
    title: 'ブロード用の形へ',
    question: '基本角度は自動で合った。クローズ形状のまま140°へ移ったら、次にどこを出す？',
    objective: '角度調整を除外しても、コースに応じて深さとツイストを作り直せる。',
    successCriterion: '形状コントロールだけで適合度93%以上へ戻す。',
    threshold: 93,
    moveBudget: 7,
    setup: { angle: 140, windSpeed: 12, sourceAngle: 45, sourceWindSpeed: 12 },
    prediction: {
      prompt: '最も大きくずれた形状コントロールは？',
      correctControl: 'outhaul',
      options: [
        { control: 'outhaul', label: 'アウトホールを出す', feedback: 'ブロードではクローズより下部に深さを戻します。現在の最大差です。' },
        { control: 'cunningham', label: 'カニンガムをさらに引く', feedback: 'ブロードではラフ張力を少し緩める方向です。' },
        { control: 'vang', label: 'バングをさらに引く', feedback: 'この条件では基準より強すぎます。まず最大差のアウトホールから戻します。' },
      ],
    },
    evidence: { correct: 'draftDepth', statement: 'クローズ用の平らな下部から、ブロード用の深さへ戻り始めた。' },
    hints: [
      '基本角度、艇バランス、センターは自動で最適です。形状差だけを見ます。',
      'クローズ形状はメイン下部が平らすぎます。',
      'アウトホールを出し、次にバングとカニンガムを優先順に合わせます。',
    ],
  },
]

export function getChallenge(id: string | null | undefined) {
  return TRIM_CHALLENGES.find((challenge) => challenge.id === id)
}

export function buildChallengeSetup(challenge: TrimChallenge): ChallengeSetup {
  const sourceAngle = challenge.setup.sourceAngle ?? challenge.setup.angle
  const sourceWindSpeed = challenge.setup.sourceWindSpeed ?? challenge.setup.windSpeed
  const controls = targetControls(challenge.boat, sourceAngle, sourceWindSpeed)

  return {
    boat: challenge.boat,
    angle: challenge.setup.angle,
    windSpeed: challenge.setup.windSpeed,
    controls: { ...controls, ...challenge.setup.overrides },
  }
}
