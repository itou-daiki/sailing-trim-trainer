import { targetControls } from './trimModel'
import type { BoatClass, ControlKey, TrimControls } from './types'

export type PredictionOption = {
  control: ControlKey
  label: string
  feedback: string
}

export type TrimChallenge = {
  id: string
  order: number
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
    id: 'bear-away-420',
    order: 1,
    boat: '420',
    band: 'COURSE CHANGE',
    title: 'ベアした直後の一手',
    question: 'クローズのトリムのまま90°へベア。最初に何を変える？',
    objective: '風向角が変われば、まずセールの迎角を合わせ直すと判断できる。',
    successCriterion: 'メイン→ジブの順で開き、適合度93%以上に戻す。',
    threshold: 93,
    moveBudget: 6,
    setup: { angle: 90, windSpeed: 8, sourceAngle: 45, sourceWindSpeed: 8 },
    prediction: {
      prompt: 'いちばん先に大きく動かすものは？',
      correctControl: 'mainSheet',
      options: [
        { control: 'mainSheet', label: 'メインシートを出す', feedback: '迎角のずれが最大です。まずメインを新しい風向角へ開きます。' },
        { control: 'vang', label: 'バングを引く', feedback: 'バングは主にツイストの調整です。今はセール全体の角度が先です。' },
        { control: 'cunningham', label: 'カニンガムを引く', feedback: 'カニンガムはドラフト位置を動かします。ベア直後の大きな迎角ずれは直せません。' },
      ],
    },
    hints: [
      'TOP図で、見かけの風とメインの向きの差を見ます。形の深さはまだ触りません。',
      'ベアするとセールに必要な角度は大きくなります。シートを出す方向です。',
      'メインシートを大きく出し、次にジブシートを出します。上から一本ずつ試します。',
    ],
  },
  {
    id: 'breeze-builds-420',
    order: 2,
    boat: '420',
    band: 'BOAT BALANCE',
    title: '8 ktから15 ktへ',
    question: '風だけが強くなり、艇が大きくヒール。最初の一手は？',
    objective: 'パワーを抜く前に、二人の体重で艇をフラットへ戻す優先順位を理解する。',
    successCriterion: '艇を起こしてから形を整え、適合度93%以上に戻す。',
    threshold: 93,
    moveBudget: 7,
    setup: { angle: 45, windSpeed: 15, sourceAngle: 45, sourceWindSpeed: 8 },
    prediction: {
      prompt: 'ヒールが増えた瞬間、最初に行うことは？',
      correctControl: 'crewHike',
      options: [
        { control: 'crewHike', label: '二人で艇を起こす', feedback: 'まず復原力を増やすと、セールの力を前進へ使い続けられます。' },
        { control: 'cunningham', label: 'カニンガムを引く', feedback: '後で必要ですが、艇が傾いたままでは力が横へ逃げます。体重が先です。' },
        { control: 'centerboard', label: 'ボードを上げる', feedback: '上りで早く上げすぎると横流れが増えます。まず艇の姿勢を戻します。' },
      ],
    },
    hints: [
      'AFT図の水面とマストの角度を見ます。セールの線より、まず艇全体の傾きです。',
      'セールのパワーを捨てる前に、使える復原力を増やします。',
      'ハイクアウトを大きく外へ。その後、バング、カニンガム、アウトホールを整えます。',
    ],
  },
  {
    id: 'draft-forward-470',
    order: 3,
    boat: '470',
    band: 'DRAFT POSITION',
    title: '後ろへ動いたドラフト',
    question: '16 ktでラフ張力だけが抜け、最大ドラフト位置が後退。何を引く？',
    objective: 'カニンガムとドラフト位置の因果を、断面の点の移動で説明できる。',
    successCriterion: '最大ドラフト位置を基準線へ戻し、適合度98%以上にする。',
    threshold: 98,
    moveBudget: 4,
    setup: { angle: 45, windSpeed: 16, overrides: { cunningham: 0 } },
    prediction: {
      prompt: '深さの「位置」を前へ戻す操作は？',
      correctControl: 'cunningham',
      options: [
        { control: 'cunningham', label: 'カニンガムを引く', feedback: 'ラフ張力が増え、最大ドラフト位置が前へ移ります。断面の点で確認します。' },
        { control: 'outhaul', label: 'アウトホールを引く', feedback: 'アウトホールは主にメイン下部の「深さ」を減らします。位置の主操作ではありません。' },
        { control: 'vang', label: 'バングを引く', feedback: 'バングは主に上部リーチとツイストを変えます。ドラフト位置とは別です。' },
      ],
    },
    hints: [
      '断面図の丸い点を見ます。現在線の点が基準線より後ろにあります。',
      'ラフに沿う張力を増やすと、ふくらみの最大位置が前へ戻ります。',
      'カニンガムを引き、UPPER・MIDDLEの点が前へ動くところを観察します。',
    ],
  },
  {
    id: 'twist-control-420',
    order: 4,
    boat: '420',
    band: 'TWIST',
    title: '開きすぎた上部',
    question: 'ビームでバングだけが抜け、ブームが浮いて上部が開いた。何を使う？',
    objective: 'バングがブームの浮きとメイン上部ツイストを抑える関係を説明できる。',
    successCriterion: 'AFT図の上部を基準へ近づけ、適合度98%以上にする。',
    threshold: 98,
    moveBudget: 4,
    setup: { angle: 90, windSpeed: 10, overrides: { vang: 0 } },
    prediction: {
      prompt: '上部リーチの開きを直接抑える操作は？',
      correctControl: 'vang',
      options: [
        { control: 'vang', label: 'バングを引く', feedback: 'ブームの浮きを抑え、上部のツイストを減らします。' },
        { control: 'outhaul', label: 'アウトホールを引く', feedback: 'アウトホールは下部の深さが中心です。上部の開きには届きにくい操作です。' },
        { control: 'cunningham', label: 'カニンガムを引く', feedback: 'ドラフト位置は動きますが、ブームの浮きとツイストは直接止めません。' },
      ],
    },
    hints: [
      'AFT図で、下部と上部の開く角度の差を見ます。',
      'ブームを下へ押さえる力が不足しています。',
      'バングを引き、上部のツイスト値が下がる変化を見ます。',
    ],
  },
  {
    id: 'slot-open-420',
    order: 5,
    boat: '420',
    band: '420 RIG',
    title: '狭すぎるスロット',
    question: '風上ジブシートを引きすぎ、ジブが内へ寄ってメインに裏風。どこを戻す？',
    objective: '風上ジブシートがジブ角度とスロット幅を変えることを理解する。',
    successCriterion: 'ジブを外へ戻し、適合度99%以上にする。',
    threshold: 99,
    moveBudget: 4,
    setup: { angle: 45, windSpeed: 10, overrides: { windwardSheet: 96 } },
    prediction: {
      prompt: '420のジブを外へ戻す最短の一手は？',
      correctControl: 'windwardSheet',
      options: [
        { control: 'windwardSheet', label: '風上ジブシートを出す', feedback: '内へ引く力を弱め、メインとの間のスロットを開きます。' },
        { control: 'jibSheet', label: '風下ジブシートを強く引く', feedback: 'さらにリーチを閉じ、スロットを苦しくする可能性があります。' },
        { control: 'chock', label: 'チョックを厚くする', feedback: 'チョックはロワーマストの曲がりに効きます。ジブの内寄せは直接戻せません。' },
      ],
    },
    hints: [
      'TOP図でジブとメインの間隔を見ます。ジブだけが内へ寄っています。',
      '420では風上側のシートがジブを内へ引く働きを持ちます。',
      '風上ジブシートを出し、ジブ角度が外へ開く様子を見ます。',
    ],
  },
  {
    id: 'jib-lead-470',
    order: 6,
    boat: '470',
    band: '470 RIG',
    title: '強風のジブリード',
    question: '15 ktなのにジブリードが最内側。スロットが閉じたらどうする？',
    objective: '470のジブリード内外位置とスロットの余裕を結びつける。',
    successCriterion: 'リードを外へ動かし、適合度99%以上にする。',
    threshold: 99,
    moveBudget: 4,
    setup: { angle: 45, windSpeed: 15, overrides: { jibLeadInOut: 100 } },
    prediction: {
      prompt: '強風でスロットを開く一手は？',
      correctControl: 'jibLeadInOut',
      options: [
        { control: 'jibLeadInOut', label: 'ジブリードを外へ', feedback: 'ジブの角度を外へ開き、メイン前部に流れの余裕を作ります。' },
        { control: 'jibSheet', label: 'ジブシートをさらに引く', feedback: 'リーチとスロットをさらに閉じる方向です。先にリードを外へ動かします。' },
        { control: 'forePuller', label: 'フォアプラーを引く', feedback: 'ロワーマストとメイン形状には効きますが、ジブの内外角度の主操作ではありません。' },
      ],
    },
    hints: [
      'TOP図で、ジブが艇の中心線へ寄りすぎていないか見ます。',
      '強風ではリードを外へ出し、メインとの間に流れの余裕を作ります。',
      'ジブリード内外を「外」へ。必要なら次に前後リードも後ろへ動かします。',
    ],
  },
  {
    id: 'broad-reach-470',
    order: 7,
    boat: '470',
    band: 'TRANSFER',
    title: 'ブロードへ使い直す',
    question: 'クローズ45°からブロード140°へ。覚えた優先順位を別条件で使えるか？',
    objective: '迎角、ツイスト、水中抵抗を、コース変化に合わせて一連で調整できる。',
    successCriterion: 'シートを先に開き、適合度93%以上へ戻す。',
    threshold: 93,
    moveBudget: 8,
    setup: { angle: 140, windSpeed: 12, sourceAngle: 45, sourceWindSpeed: 12 },
    prediction: {
      prompt: '大きくベアした直後の最優先は？',
      correctControl: 'mainSheet',
      options: [
        { control: 'mainSheet', label: 'メインシートを出す', feedback: 'まず大きな迎角ずれを直し、その後ジブと水中抵抗を合わせます。' },
        { control: 'centerboard', label: 'センターボードを上げる', feedback: '抵抗削減は必要ですが、引き込みすぎたセールの横力が先に残っています。' },
        { control: 'vang', label: 'バングを出す', feedback: 'ブロードのツイストには必要ですが、まずセール全体の角度を開きます。' },
      ],
    },
    hints: [
      '最初はTOP図だけを見ます。メインとジブが風に対して閉じすぎています。',
      '大きな角度→細かな形→水中抵抗、の順なら変化を読み分けられます。',
      'メイン、ジブを出した後、センターボードを上げ、バングとリードを整えます。',
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
