import type { CSSProperties } from 'react'
import { BOATS } from '../data/boats'
import { CONTROL_LABELS } from '../domain/trimModel'
import type { BoatClass, ControlKey, TrimAction, TrimControls } from '../domain/types'

type ControlPanelProps = {
  boat: BoatClass
  controls: TrimControls
  targets: TrimControls
  actions: TrimAction[]
  onControlChange: (control: ControlKey, value: number) => void
}

type SliderMeta = {
  key: ControlKey
  left: string
  right: string
  short: string
}

const SHAPE: SliderMeta[] = [
  { key: 'vang', left: '出す', right: '引く', short: '上部ツイスト' },
  { key: 'cunningham', left: '出す', right: '引く', short: 'ドラフト位置' },
  { key: 'outhaul', left: '出す', right: '引く', short: 'メイン下部の深さ' },
]

const ADVANCED: Record<BoatClass, SliderMeta[]> = {
  '420': [
    { key: 'chock', left: '薄い', right: '厚い', short: 'ロワーマストの曲がり' },
    { key: 'jibHeight', left: '低い', right: '高い', short: 'ジブのリード角' },
  ],
  '470': [
    { key: 'forePuller', left: '解除', right: '前へ', short: 'ロワーマストを前へ' },
    { key: 'aftPuller', left: '解除', right: '後ろへ', short: 'ロワーマストを後ろへ' },
    { key: 'jibLeadForeAft', left: '後ろ', right: '前へ', short: 'ジブのツイスト' },
  ],
}

function ControlSlider({
  meta,
  value,
  target,
  action,
  rank,
  onChange,
}: {
  meta: SliderMeta
  value: number
  target: number
  action?: TrimAction
  rank?: number
  onChange: (value: number) => void
}) {
  const rangeStyle = {
    '--range-value': `${value}%`,
    '--range-target': `${target}%`,
  } as CSSProperties

  return (
    <label className={action && rank === 1 ? 'control-slider is-highlighted' : 'control-slider'}>
      {action ? (
        <span className="control-priority">
          <strong>優先 {rank}</strong>
          <span>{action.direction}</span>
        </span>
      ) : null}
      <span className="control-title">
        <strong>{CONTROL_LABELS[meta.key]}</strong>
        <small>{meta.short}</small>
        <output>{value}</output>
      </span>
      <span className="range-wrap" style={rangeStyle}>
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          aria-label={CONTROL_LABELS[meta.key]}
          onInput={(event) => onChange(Number(event.currentTarget.value))}
        />
        <i className="target-notch" aria-hidden="true" />
      </span>
      <small className="range-ends"><span>{meta.left}</span><span>{meta.right}</span></small>
    </label>
  )
}

function ControlGroup({
  name,
  note,
  sliders,
  controls,
  targets,
  actions,
  onControlChange,
}: {
  name: string
  note: string
  sliders: SliderMeta[]
  controls: TrimControls
  targets: TrimControls
  actions: TrimAction[]
  onControlChange: (control: ControlKey, value: number) => void
}) {
  return (
    <fieldset className="control-group">
      <legend><span>{name}</span><small>{note}</small></legend>
      <div className="control-group-grid">
        {sliders.map((meta) => {
          const actionIndex = actions.findIndex((action) => action.control === meta.key)
          const action = actionIndex >= 0 ? actions[actionIndex] : undefined
          return (
            <ControlSlider
              key={meta.key}
              meta={meta}
              value={controls[meta.key]}
              target={targets[meta.key]}
              action={action}
              rank={action ? actionIndex + 1 : undefined}
              onChange={(value) => onControlChange(meta.key, value)}
            />
          )
        })}
      </div>
    </fieldset>
  )
}

export function ControlPanel({
  boat,
  controls,
  targets,
  actions,
  onControlChange,
}: ControlPanelProps) {
  const available = [...SHAPE, ...ADVANCED[boat]]
  const order = new Map(actions.map((action, index) => [action.control, index]))
  const orderedSliders = [...available].sort((a, b) =>
    (order.get(a.key) ?? 99) - (order.get(b.key) ?? 99),
  )

  return (
    <section className="control-panel" aria-labelledby="controls-title">
      <div className="control-panel-head">
        <div className="section-heading">
          <span className="section-index">C</span>
          <div>
            <p>TRIM CONTROLS</p>
            <h2 id="controls-title">優先順に一本ずつ動かす</h2>
          </div>
        </div>
        <div className="target-key"><i />細い印＝基準位置</div>
      </div>

      <p className="automatic-scope">
        <strong>自動で最適：</strong>メイン／ジブの基本角度・乗員バランス・センターボード
      </p>
      <ControlGroup
        name="SHAPE CONTROLS"
        note={actions.length > 0 ? '左上から現在の推奨順。一本動かして形を確認します。' : 'すべて基準範囲です。条件を変えて形を作り直します。'}
        sliders={orderedSliders}
        controls={controls}
        targets={targets}
        actions={actions}
        onControlChange={onControlChange}
      />
      <p className="class-shape-note"><strong>{boat}：</strong>{BOATS[boat].note}</p>
    </section>
  )
}
