import { CONTROL_EFFECTS, CONTROL_LABELS } from '../domain/trimModel'
import type { ControlKey, Guidance, TrimAction } from '../domain/types'

type CoachPanelProps = {
  guidance: Guidance
  lastControl: ControlKey
  efficiency: number
  actions: TrimAction[]
  onShowBaseline: () => void
}

export function CoachPanel({
  guidance,
  lastControl,
  efficiency,
  actions,
  onShowBaseline,
}: CoachPanelProps) {
  return (
    <aside className={`coach-panel tone-${guidance.tone}`} aria-labelledby="coach-title">
      <div className="section-heading">
        <span className="section-index">C</span>
        <div>
          <p>COACH'S NOTE</p>
          <h2 id="coach-title">次に直すこと</h2>
        </div>
      </div>

      <div className="coach-status">
        <span>{guidance.label}</span>
        <strong>{Math.round(efficiency)}%</strong>
      </div>
      <div
        className="score-track"
        role="progressbar"
        aria-label="トリム適合度"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(efficiency)}
      >
        <span style={{ width: `${efficiency}%` }} />
      </div>

      <h3>{guidance.title}</h3>
      <p className="coach-explanation">{guidance.explanation}</p>
      <div className="coach-action">
        <span>DO THIS</span>
        <p>{guidance.action}</p>
      </div>

      <section className="trim-order" aria-labelledby="trim-order-title">
        <div className="trim-order-head">
          <div>
            <span>ADJUSTMENT ORDER</span>
            <strong id="trim-order-title">操作の優先順位</strong>
          </div>
          <small>上から一本ずつ</small>
        </div>

        {actions.length > 0 ? (
          <ol>
            {actions.map((action, index) => (
              <li className={index === 0 ? 'is-first' : ''} key={action.control}>
                <span className="trim-order-rank">{index + 1}</span>
                <div>
                  <strong>{CONTROL_LABELS[action.control]}</strong>
                  <p>{action.reason}</p>
                </div>
                <span className="trim-order-direction">
                  <strong>{action.direction}</strong>
                  <small>{action.urgency === 'large' ? `差 ${action.delta}` : '少しずつ'}</small>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="trim-order-clear">
            <span aria-hidden="true">✓</span>
            <p><strong>いま直す操作はありません</strong>テルテールと艇の姿勢を保ちます。</p>
          </div>
        )}
      </section>

      <div className="last-control">
        <span>いま触ったもの</span>
        <strong>{CONTROL_LABELS[lastControl]}</strong>
        <p>{CONTROL_EFFECTS[lastControl]}</p>
      </div>

      <button type="button" className="baseline-button" onClick={onShowBaseline}>
        基準トリムを試す
        <span aria-hidden="true">→</span>
      </button>
      <p className="baseline-note">正解は一点ではありません。これは比較用の出発点です。</p>
    </aside>
  )
}
