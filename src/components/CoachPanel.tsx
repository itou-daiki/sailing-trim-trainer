import { CONTROL_LABELS } from '../domain/trimModel'
import type { Guidance, TrimAction } from '../domain/types'

type CoachPanelProps = {
  guidance: Guidance
  efficiency: number
  actions: TrimAction[]
  mode?: 'observe' | 'guide'
  onShowBaseline: () => void
}

export function CoachPanel({
  guidance,
  efficiency,
  actions,
  mode = 'guide',
  onShowBaseline,
}: CoachPanelProps) {
  if (mode === 'observe') {
    return (
      <aside className="coach-panel is-observation" aria-labelledby="coach-title">
        <div className="section-heading">
          <span className="section-index">D</span>
          <div>
            <p>OBSERVE BEFORE ADJUSTING</p>
            <h2 id="coach-title">まず形を読む</h2>
          </div>
        </div>

        <div className="coach-status">
          <span>SHAPE FIT / 現在のずれ</span>
          <strong>{Math.round(efficiency)}%</strong>
        </div>
        <div
          className="score-track"
          role="progressbar"
          aria-label="現在のトリム適合度"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(efficiency)}
        >
          <span style={{ width: `${efficiency}%` }} />
        </div>

        <p className="observation-intro">答えの操作はまだ表示しません。メインかジブ、上・中・下、次の3つのどれがずれたかを順に見ます。</p>
        <dl className="observation-key">
          <div><dt>深さ</dt><dd>セールのふくらみの大きさ</dd></div>
          <div><dt>最大位置</dt><dd>ラフ（前縁）から一番深い点まで</dd></div>
          <div><dt>ツイスト</dt><dd>上へ行くほどリーチ（後縁）が開く量</dd></div>
        </dl>
        <div className="coach-action observation-prompt">
          <span>LOOK IN THIS ORDER</span>
          <p>三面図 → 太線の選択断面 → 現在値と基準値</p>
        </div>
      </aside>
    )
  }

  return (
    <aside className={`coach-panel tone-${guidance.tone}`} aria-labelledby="coach-title">
      <div className="section-heading">
        <span className="section-index">D</span>
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

      <details className="coach-glossary">
        <summary>用語を確認：形を見る3語</summary>
        <dl className="observation-key">
          <div><dt>深さ</dt><dd>ふくらみの大きさ</dd></div>
          <div><dt>最大位置</dt><dd>ラフから一番深い点まで</dd></div>
          <div><dt>ツイスト</dt><dd>上へ行くほど開く量</dd></div>
        </dl>
      </details>

      <button type="button" className="baseline-button" onClick={onShowBaseline}>
        基準トリムを試す
        <span aria-hidden="true">→</span>
      </button>
      <p className="baseline-note">正解は一点ではありません。これは比較用の出発点です。</p>
    </aside>
  )
}
