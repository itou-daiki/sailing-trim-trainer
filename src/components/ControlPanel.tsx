import type { CSSProperties } from 'react'
import { BOATS } from '../data/boats'
import { CONTROL_LABELS, outhaulEaseMillimeters } from '../domain/trimModel'
import type { BoatClass, ControlKey, TrimAction, TrimControls } from '../domain/types'

type ControlPanelProps = {
  boat: BoatClass
  controls: TrimControls
  targets: TrimControls
  actions: TrimAction[]
  priorityOrder: ControlKey[]
  locked?: boolean
  revealGuidance?: boolean
  onControlChangeStart: (control: ControlKey) => void
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
  { key: 'outhaul', left: '25 mm出す', right: 'ブラックバンド', short: '下部の深さ／バンドから' },
]

function formatControlValue(key: ControlKey, value: number) {
  if (key !== 'outhaul') return String(value)
  const millimeters = outhaulEaseMillimeters(value)
  return `${Number.isInteger(millimeters) ? millimeters : millimeters.toFixed(1)} mm`
}

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
  locked,
  revealGuidance,
  onChangeStart,
  onChange,
}: {
  meta: SliderMeta
  value: number
  target: number
  action?: TrimAction
  rank?: number
  locked: boolean
  revealGuidance: boolean
  onChangeStart: () => void
  onChange: (value: number) => void
}) {
  const rangeStyle = {
    '--range-value': `${value}%`,
    '--range-target': `${target}%`,
  } as CSSProperties

  return (
    <label className={action && rank === 1 && revealGuidance ? 'control-slider is-highlighted' : 'control-slider'}>
      {revealGuidance ? (
        <span className={`control-priority${action ? '' : rank ? ' is-complete' : ' is-idle'}`}>
          <strong>{action ? `優先 ${rank}` : rank ? `完了 ${rank}` : '待機'}</strong>
          <span>{action
            ? `${action.direction}${action.gain > 0.05 ? ` · 適合度 +${action.gain.toFixed(1)}` : ' · 順に形を整える'}`
            : rank ? '基準範囲に入りました' : 'いまは調整不要'}</span>
        </span>
      ) : null}
      <span className="control-title">
        <strong>{CONTROL_LABELS[meta.key]}</strong>
        <small>{meta.short}</small>
        <output>{formatControlValue(meta.key, value)}</output>
      </span>
      <span className="range-wrap" style={rangeStyle}>
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          disabled={locked}
          aria-label={CONTROL_LABELS[meta.key]}
          aria-valuetext={meta.key === 'outhaul'
            ? `ブラックバンドから${formatControlValue(meta.key, value)}出す`
            : undefined}
          onFocus={onChangeStart}
          onPointerDown={onChangeStart}
          onInput={(event) => onChange(Number(event.currentTarget.value))}
        />
        {revealGuidance ? <i className="target-notch" aria-hidden="true" /> : null}
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
  priorityOrder,
  locked,
  revealGuidance,
  onControlChangeStart,
  onControlChange,
}: {
  name: string
  note: string
  sliders: SliderMeta[]
  controls: TrimControls
  targets: TrimControls
  actions: TrimAction[]
  priorityOrder: ControlKey[]
  locked: boolean
  revealGuidance: boolean
  onControlChangeStart: (control: ControlKey) => void
  onControlChange: (control: ControlKey, value: number) => void
}) {
  return (
    <fieldset className="control-group">
      <legend><span>{name}</span><small>{note}</small></legend>
      <div className="control-group-grid">
        {sliders.map((meta) => {
          const actionIndex = actions.findIndex((action) => action.control === meta.key)
          const action = actionIndex >= 0 ? actions[actionIndex] : undefined
          const priorityIndex = priorityOrder.indexOf(meta.key)
          const rank = priorityIndex >= 0
            ? priorityIndex + 1
            : action ? actionIndex + 1 : undefined
          return (
            <ControlSlider
              key={meta.key}
              meta={meta}
              value={controls[meta.key]}
              target={targets[meta.key]}
              action={action}
              rank={rank}
              locked={locked}
              revealGuidance={revealGuidance}
              onChangeStart={() => onControlChangeStart(meta.key)}
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
  priorityOrder,
  locked = false,
  revealGuidance = true,
  onControlChangeStart,
  onControlChange,
}: ControlPanelProps) {
  const available = [...SHAPE, ...ADVANCED[boat]]

  return (
    <section className={locked ? 'control-panel is-locked' : 'control-panel'} aria-labelledby="controls-title">
      <div className="control-panel-head">
        <div className="section-heading">
          <span className="section-index">C</span>
          <div>
            <p>TRIM CONTROLS</p>
            <h2 id="controls-title">優先番号を見て一本ずつ動かす</h2>
          </div>
        </div>
        <div className="target-key">{locked ? '予想後に操作できます' : <><i />細い印＝基準位置</>}</div>
      </div>

      <p className="automatic-scope">
        <strong>自動で最適：</strong>見かけ風に連動するメイン／ジブ基本角度・乗員バランス・センターボード
      </p>
      <ControlGroup
        name="SHAPE CONTROLS"
        note={locked
          ? 'まず三面図を観察。選択肢に答えてから解除します。'
          : '操作位置は固定。優先番号と完了表示だけが更新されます。'}
        sliders={available}
        controls={controls}
        targets={targets}
        actions={actions}
        priorityOrder={priorityOrder}
        locked={locked}
        revealGuidance={revealGuidance}
        onControlChangeStart={onControlChangeStart}
        onControlChange={onControlChange}
      />
      <p className="class-shape-note"><strong>{boat}：</strong>{BOATS[boat].note}</p>
    </section>
  )
}
