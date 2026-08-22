import { useEffect, useRef } from 'react'
import { CONTROL_LABELS } from '../domain/trimModel'
import type { LearningProgress } from '../domain/progress'
import type { ControlKey } from '../domain/types'
import type { TrimChallenge } from '../domain/challenges'

export type ChallengePhase = 'preview' | 'practice' | 'complete'

type ChallengeDeckProps = {
  challenges: TrimChallenge[]
  active: TrimChallenge
  progress: LearningProgress
  phase: ChallengePhase
  prediction?: ControlKey
  moveCount: number
  startEfficiency: number
  currentEfficiency: number
  hintLevel: number
  moveFeedback: string
  shareStatus: string
  assisted: boolean
  onSelect: (id: string) => void
  onPredict: (control: ControlKey) => void
  onStart: () => void
  onHint: () => void
  onRetry: () => void
  onNext: () => void
  onShare: () => void
}

function StepRail({ phase, prediction }: { phase: ChallengePhase; prediction?: ControlKey }) {
  const current = phase === 'complete' ? 4 : phase === 'practice' ? 3 : prediction ? 2 : 1
  const labels = ['状況を読む', '一手を予想', '一本ずつ試す', '別条件へ']

  return (
    <ol className="challenge-steps" aria-label={`学習段階 ${current} / 4`}>
      {labels.map((label, index) => (
        <li className={index + 1 <= current ? 'is-reached' : ''} aria-current={index + 1 === current ? 'step' : undefined} key={label}>
          <span>{index + 1}</span>
          <small>{label}</small>
        </li>
      ))}
    </ol>
  )
}

export function ChallengeDeck({
  challenges,
  active,
  progress,
  phase,
  prediction,
  moveCount,
  startEfficiency,
  currentEfficiency,
  hintLevel,
  moveFeedback,
  shareStatus,
  assisted,
  onSelect,
  onPredict,
  onStart,
  onHint,
  onRetry,
  onNext,
  onShare,
}: ChallengeDeckProps) {
  const activeButtonRef = useRef<HTMLButtonElement>(null)
  const completedCount = challenges.filter((challenge) => progress.records[challenge.id]?.completed).length
  const selectedOption = active.prediction.options.find((option) => option.control === prediction)
  const predictionCorrect = prediction === active.prediction.correctControl
  const activeRecord = progress.records[active.id]

  useEffect(() => {
    activeButtonRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [active.id])

  return (
    <section className="challenge-deck" aria-labelledby="challenge-title">
      <div className="challenge-index">
        <div className="challenge-index-head">
          <div>
            <span>TRAINING LOG</span>
            <strong>{completedCount} / {challenges.length} 完了</strong>
          </div>
          <div
            className="challenge-progress"
            role="progressbar"
            aria-label="全チャレンジ進捗"
            aria-valuemin={0}
            aria-valuemax={challenges.length}
            aria-valuenow={completedCount}
            aria-valuetext={`${completedCount} / ${challenges.length} 完了`}
          >
            <span style={{ width: `${(completedCount / challenges.length) * 100}%` }} />
          </div>
        </div>

        <ol className="challenge-list">
          {challenges.map((challenge) => {
            const record = progress.records[challenge.id]
            return (
              <li key={challenge.id}>
                <button
                  ref={challenge.id === active.id ? activeButtonRef : undefined}
                  type="button"
                  className={challenge.id === active.id ? 'is-active' : ''}
                  aria-current={challenge.id === active.id ? 'step' : undefined}
                  onClick={() => onSelect(challenge.id)}
                >
                  <span>{String(challenge.order).padStart(2, '0')}</span>
                  <span><strong>{challenge.title}</strong><small>{challenge.boat} / {challenge.band}</small></span>
                  <i aria-label={record?.completed ? '完了' : '未完了'}>{record?.completed ? '済' : '—'}</i>
                </button>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="challenge-sheet">
        <header className="challenge-sheet-head">
          <div>
            <span className="challenge-number">DRILL {String(active.order).padStart(2, '0')} · {active.boat}</span>
            <h2 id="challenge-title" tabIndex={-1}>{active.title}</h2>
            <p>{active.question}</p>
          </div>
          <button type="button" className="share-button" onClick={onShare}>
            条件を共有
            <span aria-hidden="true">↗</span>
          </button>
        </header>

        <StepRail phase={phase} prediction={prediction} />

        <div className="challenge-criteria">
          <div><span>LEARNING TARGET</span><p>{active.objective}</p></div>
          <div><span>SUCCESS</span><p>{active.successCriterion}</p></div>
        </div>

        {phase === 'preview' ? (
          <div className="prediction-block">
            <fieldset>
              <legend>{active.prediction.prompt}</legend>
              <div className="prediction-options">
                {active.prediction.options.map((option) => (
                  <button
                    type="button"
                    className={prediction === option.control ? 'is-selected' : ''}
                    aria-pressed={prediction === option.control}
                    onClick={() => onPredict(option.control)}
                    key={option.control}
                  >
                    <span>{CONTROL_LABELS[option.control]}</span>
                    <strong>{option.label}</strong>
                  </button>
                ))}
              </div>
            </fieldset>

            {selectedOption ? (
              <div className={predictionCorrect ? 'prediction-response is-correct' : 'prediction-response is-misconception'} role="status">
                <strong>{predictionCorrect ? '予想の筋が通っています' : 'ここを見分けよう'}</strong>
                <p>{selectedOption.feedback}</p>
              </div>
            ) : (
              <p className="prediction-wait">操作する前に一つ選びます。正解暗記ではなく、何を先に直すかの予想です。</p>
            )}

            <button type="button" className="challenge-start" disabled={!prediction} onClick={onStart}>
              この条件で実験を始める
              <span aria-hidden="true">→</span>
            </button>
          </div>
        ) : null}

        {phase === 'practice' ? (
          <div className="practice-status" aria-live="polite">
            <div className="practice-readout">
              <div><span>START</span><strong>{Math.round(startEfficiency)}%</strong></div>
              <div><span>NOW</span><strong>{Math.round(currentEfficiency)}%</strong></div>
              <div><span>MOVES</span><strong>{moveCount}<small> / 目安 {active.moveBudget}</small></strong></div>
            </div>
            <p className="move-feedback">{moveFeedback || '下のコントロールを一本だけ動かし、三面図と艇速の変化を見ます。'}</p>
            <div className="hint-line">
              {hintLevel > 0 ? (
                <p><span>HINT {hintLevel}</span>{active.hints[hintLevel - 1]}</p>
              ) : (
                <p><span>NO HINT</span>迷ったら、見る場所だけを一つ示します。</p>
              )}
              <button type="button" onClick={onHint} disabled={hintLevel >= active.hints.length}>
                {hintLevel === 0 ? '観察ヒント' : hintLevel < active.hints.length ? 'もう一段ヒント' : 'ヒント表示済み'}
              </button>
            </div>
          </div>
        ) : null}

        {phase === 'complete' ? (
          <div className="challenge-complete" role="status">
            <div className="completion-stamp"><span>TRIMMED</span><strong>{Math.round(currentEfficiency)}%</strong></div>
            <div>
              <span>OUTER LOOP / 次の条件へ</span>
              <h3>基準範囲へ戻せました</h3>
              <p>
                {moveCount}回の操作で完了{assisted ? '（ヒント／基準形を使用）' : ''}。
                同じ答えを繰り返さず、次は条件を変えて判断を使い直します。
              </p>
              {activeRecord?.bestMoves ? <small>この端末の最少操作：{activeRecord.bestMoves}回</small> : null}
            </div>
            <div className="completion-actions">
              <button type="button" onClick={onRetry}>もう一度</button>
              <button type="button" className="next-challenge" onClick={onNext}>次の条件へ <span aria-hidden="true">→</span></button>
            </div>
          </div>
        ) : null}

        {shareStatus ? <p className="share-status" role="status">{shareStatus}</p> : null}
      </div>
    </section>
  )
}
