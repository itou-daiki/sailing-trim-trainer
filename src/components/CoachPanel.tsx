import { CONTROL_EFFECTS, CONTROL_LABELS } from '../domain/trimModel'
import type { ControlKey, Guidance } from '../domain/types'

type CoachPanelProps = {
  guidance: Guidance
  lastControl: ControlKey
  efficiency: number
  onShowBaseline: () => void
}

export function CoachPanel({
  guidance,
  lastControl,
  efficiency,
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
      <div className="score-track" aria-label={`トリム適合度 ${Math.round(efficiency)}%`}>
        <span style={{ width: `${efficiency}%` }} />
      </div>

      <h3>{guidance.title}</h3>
      <p className="coach-explanation">{guidance.explanation}</p>
      <div className="coach-action">
        <span>DO THIS</span>
        <p>{guidance.action}</p>
      </div>

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
