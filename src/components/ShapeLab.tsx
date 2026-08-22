import type { SailShape } from '../domain/types'

type ShapeLabProps = {
  actual: { main: SailShape; jib: SailShape }
  target: { main: SailShape; jib: SailShape }
  showTarget: boolean
  onToggleTarget: () => void
}

const LEVELS = [
  { id: 'UPPER', modifier: 0.76, twist: 1 },
  { id: 'MIDDLE', modifier: 1, twist: 0.52 },
  { id: 'LOWER', modifier: 1.08, twist: 0.12 },
]

function shapePath(shape: SailShape, depthModifier: number, twistModifier: number) {
  const points: string[] = []
  const chord = 228
  const startX = 20
  const baseline = 56
  const draft = shape.draftDepth * 250 * depthModifier
  const position = shape.draftPosition

  for (let index = 0; index <= 24; index += 1) {
    const x = index / 24
    const rise =
      x <= position
        ? Math.sin((x / position) * (Math.PI / 2))
        : Math.sin(((1 - x) / (1 - position)) * (Math.PI / 2))
    const twistLift = x * shape.twist * 0.34 * twistModifier
    points.push(`${startX + x * chord},${baseline - rise * draft - twistLift}`)
  }

  return `M${points.join(' L')}`
}

function SailSections({
  name,
  actual,
  target,
  showTarget,
}: {
  name: string
  actual: SailShape
  target: SailShape
  showTarget: boolean
}) {
  return (
    <div className="sail-sections">
      <div className="sail-section-head">
        <strong>{name}</strong>
        <span>深さ {(actual.draftDepth * 100).toFixed(1)}%</span>
        <span>位置 {Math.round(actual.draftPosition * 100)}%</span>
        <span>ツイスト {Math.round(actual.twist)}°</span>
      </div>
      {LEVELS.map((level) => (
        <div className="section-plot" key={level.id}>
          <span>{level.id}</span>
          <svg viewBox="0 0 270 72" preserveAspectRatio="none" aria-hidden="true">
            <path d="M20 56H248" className="shape-chord" />
            {showTarget ? (
              <path
                d={shapePath(target, level.modifier, level.twist)}
                className="shape-target"
              />
            ) : null}
            <path
              d={shapePath(actual, level.modifier, level.twist)}
              className="shape-actual"
            />
            <circle
              cx={20 + actual.draftPosition * 228}
              cy={56 - actual.draftDepth * 250 * level.modifier - actual.draftPosition * actual.twist * 0.34 * level.twist}
              r="3.2"
              className="draft-point"
            />
          </svg>
        </div>
      ))}
    </div>
  )
}

export function ShapeLab({ actual, target, showTarget, onToggleTarget }: ShapeLabProps) {
  return (
    <section className="shape-lab" aria-labelledby="shape-title">
      <div className="shape-lab-head">
        <div className="section-heading">
          <span className="section-index">D</span>
          <div>
            <p>FLYING SHAPE</p>
            <h2 id="shape-title">ドラフトを断面で見る</h2>
          </div>
        </div>
        <button
          type="button"
          className={showTarget ? 'target-toggle is-active' : 'target-toggle'}
          aria-pressed={showTarget}
          onClick={onToggleTarget}
        >
          <i aria-hidden="true" />
          基準形を重ねる
        </button>
      </div>

      <p className="shape-definition">
        <strong>ドラフト</strong>＝セール断面のいちばん深い部分。点が左右へ動くと、最大深さの位置が変わっています。
      </p>

      <div className="shape-grid">
        <SailSections name="MAINSAIL" actual={actual.main} target={target.main} showTarget={showTarget} />
        <SailSections name="JIB" actual={actual.jib} target={target.jib} showTarget={showTarget} />
      </div>

      <div className="shape-legend">
        <span><i className="actual-line" />現在</span>
        <span><i className="target-line" />基準形</span>
        <span><i className="point-mark" />最大ドラフト位置</span>
      </div>
    </section>
  )
}
