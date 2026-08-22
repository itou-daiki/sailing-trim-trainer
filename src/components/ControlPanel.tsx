import type { CSSProperties } from 'react'
import { BOATS } from '../data/boats'
import { CONTROL_LABELS } from '../domain/trimModel'
import type { BoatClass, ControlKey, TrimControls } from '../domain/types'

type ControlPanelProps = {
  boat: BoatClass
  controls: TrimControls
  targets: TrimControls
  highlightedControl?: ControlKey
  onControlChange: (control: ControlKey, value: number) => void
}

type SliderMeta = {
  key: ControlKey
  left: string
  right: string
  short: string
}

const PRIMARY: SliderMeta[] = [
  { key: 'mainSheet', left: '出す', right: '引く', short: '迎角 + リーチ' },
  { key: 'jibSheet', left: '出す', right: '引く', short: '迎角 + スロット' },
  { key: 'crewHike', left: '内側', right: '外へ', short: 'ヒールを止める' },
]

const SHAPE: SliderMeta[] = [
  { key: 'vang', left: '出す', right: '引く', short: '上部ツイスト' },
  { key: 'cunningham', left: '出す', right: '引く', short: 'ドラフト位置' },
  { key: 'outhaul', left: '出す', right: '引く', short: 'メイン下部の深さ' },
]

const BALANCE: SliderMeta[] = [
  { key: 'centerboard', left: '上げる', right: '下げる', short: '横流れと抵抗' },
  { key: 'crewForeAft', left: '後ろ', right: '前へ', short: '船体の濡れ方' },
]

const ADVANCED: Record<BoatClass, SliderMeta[]> = {
  '420': [
    { key: 'chock', left: '薄い', right: '厚い', short: 'ロワーマストの曲がり' },
    { key: 'jibHeight', left: '低い', right: '高い', short: 'ジブのリード角' },
    { key: 'windwardSheet', left: '出す', right: '引く', short: 'ジブを内へ寄せる' },
  ],
  '470': [
    { key: 'forePuller', left: '解除', right: '前へ', short: 'ロワーマストを前へ' },
    { key: 'aftPuller', left: '解除', right: '後ろへ', short: 'ロワーマストを後ろへ' },
    { key: 'jibLeadForeAft', left: '後ろ', right: '前へ', short: 'ジブのツイスト' },
    { key: 'jibLeadInOut', left: '外', right: '内へ', short: '角度とスロット' },
  ],
}

function ControlSlider({
  meta,
  value,
  target,
  isHighlighted,
  onChange,
}: {
  meta: SliderMeta
  value: number
  target: number
  isHighlighted: boolean
  onChange: (value: number) => void
}) {
  const rangeStyle = {
    '--range-value': `${value}%`,
    '--range-target': `${target}%`,
  } as CSSProperties

  return (
    <label className={isHighlighted ? 'control-slider is-highlighted' : 'control-slider'}>
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
          onChange={(event) => onChange(Number(event.target.value))}
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
  highlightedControl,
  onControlChange,
}: {
  name: string
  note: string
  sliders: SliderMeta[]
  controls: TrimControls
  targets: TrimControls
  highlightedControl?: ControlKey
  onControlChange: (control: ControlKey, value: number) => void
}) {
  return (
    <fieldset className="control-group">
      <legend><span>{name}</span><small>{note}</small></legend>
      <div className="control-group-grid">
        {sliders.map((meta) => (
          <ControlSlider
            key={meta.key}
            meta={meta}
            value={controls[meta.key]}
            target={targets[meta.key]}
            isHighlighted={highlightedControl === meta.key}
            onChange={(value) => onControlChange(meta.key, value)}
          />
        ))}
      </div>
    </fieldset>
  )
}

export function ControlPanel({
  boat,
  controls,
  targets,
  highlightedControl,
  onControlChange,
}: ControlPanelProps) {
  return (
    <section className="control-panel" aria-labelledby="controls-title">
      <div className="control-panel-head">
        <div className="section-heading">
          <span className="section-index">E</span>
          <div>
            <p>TRIM CONTROLS</p>
            <h2 id="controls-title">一本ずつ動かす</h2>
          </div>
        </div>
        <div className="target-key"><i />細い印＝基準位置</div>
      </div>

      <ControlGroup
        name="01 / まず合わせる"
        note="セール角度と艇の姿勢"
        sliders={PRIMARY}
        controls={controls}
        targets={targets}
        highlightedControl={highlightedControl}
        onControlChange={onControlChange}
      />
      <ControlGroup
        name="02 / 形を作る"
        note="ドラフトとツイスト"
        sliders={SHAPE}
        controls={controls}
        targets={targets}
        highlightedControl={highlightedControl}
        onControlChange={onControlChange}
      />
      <ControlGroup
        name="03 / 水中と前後"
        note="横流れと船体抵抗"
        sliders={BALANCE}
        controls={controls}
        targets={targets}
        highlightedControl={highlightedControl}
        onControlChange={onControlChange}
      />
      <ControlGroup
        name={`04 / ${boat} リグ`}
        note={BOATS[boat].note}
        sliders={ADVANCED[boat]}
        controls={controls}
        targets={targets}
        highlightedControl={highlightedControl}
        onControlChange={onControlChange}
      />
    </section>
  )
}
