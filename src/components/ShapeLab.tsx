import { useMemo, useState } from 'react'
import { CONTROL_EFFECTS, CONTROL_LABELS } from '../domain/trimModel'
import type { ControlKey, SailLevel, SailShape } from '../domain/types'

type SailKey = 'main' | 'jib'
type LevelKey = SailLevel

type ShapeLabProps = {
  actual: { main: SailShape; jib: SailShape }
  target: { main: SailShape; jib: SailShape }
  showTarget: boolean
  focusControl?: ControlKey
  onToggleTarget: () => void
}

const LEVELS: Array<{
  id: LevelKey
  label: string
  height: string
}> = [
  { id: 'upper', label: '上部', height: '75%' },
  { id: 'middle', label: '中部', height: '50%' },
  { id: 'lower', label: '下部', height: '25%' },
]

const CONTROL_FOCUS: Partial<Record<ControlKey, { sail: SailKey; level: LevelKey }>> = {
  vang: { sail: 'main', level: 'upper' },
  cunningham: { sail: 'main', level: 'middle' },
  outhaul: { sail: 'main', level: 'lower' },
  chock: { sail: 'main', level: 'middle' },
  forePuller: { sail: 'main', level: 'middle' },
  aftPuller: { sail: 'main', level: 'middle' },
  jibHeight: { sail: 'jib', level: 'upper' },
  jibLeadForeAft: { sail: 'jib', level: 'upper' },
}

function sectionReading(shape: SailShape, level: (typeof LEVELS)[number]) {
  const section = shape.sections[level.id]
  return { depth: section.draftDepth, position: section.draftPosition, twist: section.twist }
}

function shapePath(depth: number, position: number) {
  const points: string[] = []
  const chord = 560
  const startX = 80
  const baseline = 210
  const draft = depth * 900

  for (let index = 0; index <= 40; index += 1) {
    const x = index / 40
    const rise = x <= position
      ? Math.sin((x / position) * (Math.PI / 2))
      : Math.sin(((1 - x) / (1 - position)) * (Math.PI / 2))
    points.push(`${startX + x * chord},${baseline - rise * draft}`)
  }

  return `M${points.join(' L')}`
}

function signed(value: number, digits = 1) {
  if (Math.abs(value) < 0.05) return '±0'
  return `${value > 0 ? '+' : '−'}${Math.abs(value).toFixed(digits)}`
}

function readingState(kind: 'depth' | 'position' | 'twist', delta: number) {
  const threshold = kind === 'depth' ? 0.3 : 0.8
  if (Math.abs(delta) <= threshold) return '基準内'
  if (kind === 'depth') return delta > 0 ? '深すぎ' : 'フラットすぎ'
  if (kind === 'position') return delta > 0 ? '後ろ寄り' : '前寄り'
  return delta > 0 ? '開きすぎ' : '閉じすぎ'
}

function ReadingCard({
  label,
  current,
  target,
  unit,
  kind,
}: {
  label: string
  current: number
  target: number
  unit: string
  kind: 'depth' | 'position' | 'twist'
}) {
  const delta = current - target
  const isGood = readingState(kind, delta) === '基準内'

  return (
    <div className={isGood ? 'shape-reading is-good' : 'shape-reading'}>
      <span>{label}</span>
      <strong>{current.toFixed(kind === 'position' ? 0 : 1)}{unit}</strong>
      <small>基準 {target.toFixed(kind === 'position' ? 0 : 1)}{unit}</small>
      <p><b>{signed(delta, kind === 'position' ? 0 : 1)}{unit}</b>{readingState(kind, delta)}</p>
    </div>
  )
}

function TwistPlot({
  actual,
  target,
  showTarget,
}: {
  actual: SailShape
  target: SailShape
  showTarget: boolean
}) {
  const line = (twist: number, level: (typeof LEVELS)[number], y: number) => {
    const angle = twist
    const radians = (angle * Math.PI) / 180
    return {
      x2: 74 + Math.cos(radians) * 180,
      y2: y - Math.sin(radians) * 180,
      angle,
    }
  }

  return (
    <div className="twist-plot">
      <div className="shape-subhead">
        <div><span>TWIST</span><strong>高さで変わる開き角</strong></div>
        <small>断面の深さとは別に読む</small>
      </div>
      <svg viewBox="0 0 330 245" role="img" aria-label={`上部ツイストは現在${Math.round(actual.twist)}度、基準${Math.round(target.twist)}度`}>
        <path className="twist-mast" d="M58 20V226" />
        {LEVELS.map((level, index) => {
          const y = 75 + index * 70
          const currentLine = line(actual.sections[level.id].twist, level, y)
          const targetLine = line(target.sections[level.id].twist, level, y)
          return (
            <g key={level.id}>
              <path className="twist-zero" d={`M74 ${y}H292`} />
              {showTarget ? <path className="twist-target" d={`M74 ${y}L${targetLine.x2} ${targetLine.y2}`} /> : null}
              <path className="twist-actual" d={`M74 ${y}L${currentLine.x2} ${currentLine.y2}`} />
              <circle className="twist-origin" cx="74" cy={y} r="3" />
              <text x="8" y={y + 4}>{level.label}</text>
              <text className="twist-value" x="286" y={currentLine.y2 - 5}>{currentLine.angle.toFixed(1)}°</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function ShapeLab({
  actual,
  target,
  showTarget,
  focusControl,
  onToggleTarget,
}: ShapeLabProps) {
  const [sailOverride, setSailOverride] = useState<SailKey>()
  const [levelOverride, setLevelOverride] = useState<LevelKey>()
  const automaticFocus = focusControl ? CONTROL_FOCUS[focusControl] : undefined
  const sailKey = sailOverride ?? automaticFocus?.sail ?? 'main'
  const levelKey = levelOverride ?? automaticFocus?.level ?? 'middle'

  const level = LEVELS.find((item) => item.id === levelKey) ?? LEVELS[1]
  const currentShape = actual[sailKey]
  const targetShape = target[sailKey]
  const current = useMemo(() => sectionReading(currentShape, level), [currentShape, level])
  const reference = useMemo(() => sectionReading(targetShape, level), [level, targetShape])
  const currentPath = shapePath(current.depth, current.position)
  const targetPath = shapePath(reference.depth, reference.position)
  const currentPeakX = 80 + current.position * 560
  const currentPeakY = 210 - current.depth * 900
  const targetPeakX = 80 + reference.position * 560
  const targetPeakY = 210 - reference.depth * 900
  const sailLabel = sailKey === 'main' ? 'メインセール' : 'ジブ'

  return (
    <section className="shape-lab" aria-labelledby="shape-title">
      <div className="shape-lab-head">
        <div className="section-heading">
          <span className="section-index">B</span>
          <div>
            <p>LIVE SHAPE MONITOR</p>
            <h2 id="shape-title">動かしながら形を見る</h2>
          </div>
        </div>
        <button
          type="button"
          className={showTarget ? 'target-toggle is-active' : 'target-toggle'}
          aria-pressed={showTarget}
          onClick={onToggleTarget}
        >
          <i aria-hidden="true" />
          基準帯を重ねる
        </button>
      </div>

      <div className="shape-purpose">
        <strong>見る順：深さ → 最大深さ位置 → ツイスト</strong>
        <span>基本角度・艇バランス・センターボードは自動で最適に保ちます。</span>
      </div>

      <div className="shape-selector-row">
        <div className="sail-selector" aria-label="観察するセール">
          <button type="button" className={sailKey === 'main' ? 'is-selected' : ''} aria-pressed={sailKey === 'main'} onClick={() => setSailOverride('main')}>
            <span>MAIN</span><strong>メインセール</strong>
          </button>
          <button type="button" className={sailKey === 'jib' ? 'is-selected' : ''} aria-pressed={sailKey === 'jib'} onClick={() => setSailOverride('jib')}>
            <span>JIB</span><strong>ジブ</strong>
          </button>
        </div>
        <div className="stripe-selector" aria-label="観察するドラフトストライプ">
          {LEVELS.map((item) => (
            <button key={item.id} type="button" className={levelKey === item.id ? 'is-selected' : ''} aria-pressed={levelKey === item.id} onClick={() => setLevelOverride(item.id)}>
              <strong>{item.label}</strong><span>{item.height}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="shape-focus-grid">
        <div className="profile-plot">
          <div className="shape-subhead">
            <div><span>{sailKey.toUpperCase()} / {level.label}</span><strong>{sailLabel}の水平断面</strong></div>
            <small>ラフからリーチまで</small>
          </div>
          <svg viewBox="0 0 720 295" role="img" aria-label={`${sailLabel}${level.label}。深さ${(current.depth * 100).toFixed(1)}%、最大深さ位置${Math.round(current.position * 100)}%`}>
            <defs>
              <marker id="shape-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0 0L10 5L0 10Z" />
              </marker>
            </defs>
            <path className="shape-chord" d="M80 210H640" />
            {showTarget ? <path className="shape-target-band" d={targetPath} /> : null}
            {showTarget ? <path className="shape-target" d={targetPath} /> : null}
            <path className="shape-current-fill" d={`${currentPath}L640 210L80 210Z`} />
            <path className="shape-actual" d={currentPath} />
            {showTarget ? <circle className="target-point" cx={targetPeakX} cy={targetPeakY} r="7" /> : null}
            <circle className="draft-point" cx={currentPeakX} cy={currentPeakY} r="7" />
            <path className="depth-measure" d={`M${currentPeakX} 210V${currentPeakY}`} markerStart="url(#shape-arrow)" markerEnd="url(#shape-arrow)" />
            <text className="measure-label" x={currentPeakX + 13} y={(210 + currentPeakY) / 2}>深さ {(current.depth * 100).toFixed(1)}%</text>
            <path className="position-measure" d={`M80 244H${currentPeakX}`} markerStart="url(#shape-arrow)" markerEnd="url(#shape-arrow)" />
            <text className="measure-label" x={(80 + currentPeakX) / 2} y="266" textAnchor="middle">位置 {Math.round(current.position * 100)}%</text>
            <text className="edge-label" x="80" y="286">ラフ / LUFF 0%</text>
            <text className="edge-label" x="640" y="286" textAnchor="end">リーチ / LEECH 100%</text>
          </svg>
        </div>

        <TwistPlot actual={currentShape} target={targetShape} showTarget={showTarget} />
        <div className="shape-readings" aria-live="polite">
          <ReadingCard label={`${level.label}の深さ`} current={current.depth * 100} target={reference.depth * 100} unit="%" kind="depth" />
          <ReadingCard label="最大深さ位置" current={current.position * 100} target={reference.position * 100} unit="%" kind="position" />
          <ReadingCard label={`${level.label}ツイスト`} current={current.twist} target={reference.twist} unit="°" kind="twist" />
        </div>
      </div>

      {focusControl ? (
        <div className="shape-cause">
          <span>いま見る操作</span>
          <strong>{CONTROL_LABELS[focusControl]}</strong>
          <p>{CONTROL_EFFECTS[focusControl]}</p>
        </div>
      ) : null}

      <div className="shape-legend">
        <span><i className="actual-line" />現在</span>
        <span><i className="target-line" />基準帯の中心</span>
        <span><i className="point-mark" />現在の最大深さ点</span>
        <span><i className="target-point-mark" />基準の最大深さ点</span>
      </div>
    </section>
  )
}
