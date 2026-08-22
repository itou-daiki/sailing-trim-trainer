import { useEffect, useMemo, useState } from 'react'
import { BoatView } from './components/BoatView'
import { ChallengeDeck } from './components/ChallengeDeck'
import type { ChallengePhase } from './components/ChallengeDeck'
import { CoachPanel } from './components/CoachPanel'
import { ControlPanel } from './components/ControlPanel'
import { CourseBoard } from './components/CourseBoard'
import { Masthead } from './components/Masthead'
import { MetricsRail } from './components/MetricsRail'
import { BOATS } from './data/boats'
import { buildChallengeSetup, getChallenge, TRIM_CHALLENGES } from './domain/challenges'
import { courseName } from './domain/course'
import { loadProgress, saveProgress, updateRecord } from './domain/progress'
import { calculateTrim, CONTROL_LABELS, targetControls } from './domain/trimModel'
import type { BoatClass, ControlKey, TrimControls } from './domain/types'

const INITIAL_ANGLE = 45
const INITIAL_WIND = 8

function browserStorage() {
  if (typeof window === 'undefined') return undefined
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

function challengeFromUrl() {
  if (typeof window === 'undefined') return TRIM_CHALLENGES[0]
  const id = new URLSearchParams(window.location.search).get('challenge')
  return getChallenge(id) ?? TRIM_CHALLENGES[0]
}

function App() {
  const [activeChallengeId, setActiveChallengeId] = useState(() => challengeFromUrl().id)
  const activeChallenge = getChallenge(activeChallengeId) ?? TRIM_CHALLENGES[0]
  const [boat, setBoat] = useState<BoatClass>(() => challengeFromUrl().boat)
  const [angle, setAngle] = useState(INITIAL_ANGLE)
  const [windSpeed, setWindSpeed] = useState(INITIAL_WIND)
  const [controls, setControls] = useState<TrimControls>(() =>
    targetControls(challengeFromUrl().boat, INITIAL_ANGLE, INITIAL_WIND),
  )
  const [lastControl, setLastControl] = useState<ControlKey>('cunningham')
  const [showTarget, setShowTarget] = useState(true)
  const [phase, setPhase] = useState<ChallengePhase>('preview')
  const [prediction, setPrediction] = useState<ControlKey>()
  const [moveCount, setMoveCount] = useState(0)
  const [startEfficiency, setStartEfficiency] = useState(100)
  const [hintLevel, setHintLevel] = useState(0)
  const [moveFeedback, setMoveFeedback] = useState('')
  const [assisted, setAssisted] = useState(false)
  const [shareStatus, setShareStatus] = useState('')
  const [progress, setProgress] = useState(() => loadProgress(browserStorage()))
  const [courseNotice, setCourseNotice] = useState(
    '基本角度・艇バランス・センターボードは自動で最適です。風を変え、形状コントロールだけを作り直します。',
  )

  const result = useMemo(
    () => calculateTrim(boat, angle, windSpeed, controls),
    [angle, boat, controls, windSpeed],
  )

  useEffect(() => {
    saveProgress(progress, browserStorage())
  }, [progress])

  const resetAttemptState = () => {
    setPhase('preview')
    setPrediction(undefined)
    setMoveCount(0)
    setHintLevel(0)
    setMoveFeedback('')
    setAssisted(false)
    setShareStatus('')
  }

  const selectChallenge = (id: string) => {
    const nextChallenge = getChallenge(id)
    if (!nextChallenge) return
    setActiveChallengeId(nextChallenge.id)
    setBoat(nextChallenge.boat)
    setControls(targetControls(nextChallenge.boat, angle, windSpeed))
    setLastControl(nextChallenge.prediction.correctControl)
    setCourseNotice(
      `${BOATS[nextChallenge.boat].name}の基準トリムで課題を確認します。予想後に崩れた条件を読み込みます。`,
    )
    resetAttemptState()
  }

  const recordCompletion = (moves: number) => {
    setProgress((current) => updateRecord(current, activeChallenge.id, (record) => ({
      ...record,
      completed: true,
      assisted: record.assisted || assisted,
      bestMoves: record.bestMoves === undefined ? moves : Math.min(record.bestMoves, moves),
    })))
  }

  const startChallenge = () => {
    if (!prediction) return
    const setup = buildChallengeSetup(activeChallenge)
    const startingResult = calculateTrim(setup.boat, setup.angle, setup.windSpeed, setup.controls)
    setBoat(setup.boat)
    setAngle(setup.angle)
    setWindSpeed(setup.windSpeed)
    setControls(setup.controls)
    setLastControl(activeChallenge.prediction.correctControl)
    setPhase('practice')
    setMoveCount(0)
    setStartEfficiency(startingResult.metrics.efficiency)
    setHintLevel(0)
    setMoveFeedback('予想を残しました。優先順位の一番上を一本だけ動かし、大きな断面図の差を確かめます。')
    setAssisted(false)
    setCourseNotice(
      `${activeChallenge.boat} / 真風角 ${setup.angle}° / ${setup.windSpeed} kt。あえて崩れたトリムから始めます。`,
    )
    setProgress((current) => updateRecord(current, activeChallenge.id, (record) => ({
      ...record,
      attempts: record.attempts + 1,
      predictionCorrect: prediction === activeChallenge.prediction.correctControl,
    })))
  }

  const changeBoat = (nextBoat: BoatClass) => {
    setBoat(nextBoat)
    setControls(targetControls(nextBoat, angle, windSpeed))
    setCourseNotice(
      `${BOATS[nextBoat].name}へ切り替えました。現在の風に合う基準トリムから始めます。`,
    )
    if (phase === 'practice') {
      setMoveFeedback(`チャレンジ指定は${activeChallenge.boat}です。戻すか、チャレンジをやり直してください。`)
    }
  }

  const changeCourse = (nextAngle: number) => {
    if (nextAngle === angle) return
    const before = courseName(angle)
    const after = courseName(nextAngle)
    setAngle(nextAngle)
    setCourseNotice(
      `${before}から${after}へ変更。基本角度は自動で合いました。深さ・位置・ツイストだけを作り直します。`,
    )
    if (phase === 'practice' && nextAngle !== activeChallenge.setup.angle) {
      setMoveFeedback(`指定条件は真風角${activeChallenge.setup.angle}°です。条件を変えた試行は自由練習として扱います。`)
    }
  }

  const changeWind = (nextWind: number) => {
    setWindSpeed(nextWind)
    setCourseNotice(
      `風速を${nextWind} ktへ変更。艇は水平のまま、ドラフト深さ・位置・ツイストの差を見ます。`,
    )
    if (phase === 'practice' && nextWind !== activeChallenge.setup.windSpeed) {
      setMoveFeedback(`指定条件は${activeChallenge.setup.windSpeed} ktです。条件を戻すと到達判定が再開します。`)
    }
  }

  const changeControl = (control: ControlKey, value: number) => {
    const nextControls = { ...controls, [control]: value }
    setLastControl(control)
    setControls(nextControls)

    if (phase !== 'practice') return

    const nextResult = calculateTrim(boat, angle, windSpeed, nextControls)
    const nextMoves = moveCount + 1
    const change = nextResult.metrics.efficiency - result.metrics.efficiency
    const nextAction = nextResult.actions[0]
    const conditionsMatch =
      boat === activeChallenge.boat &&
      angle === activeChallenge.setup.angle &&
      windSpeed === activeChallenge.setup.windSpeed

    setMoveCount(nextMoves)

    if (change > 0.7) {
      setMoveFeedback(
        `改善 +${change.toFixed(1)}%。${nextAction ? `次は${CONTROL_LABELS[nextAction.control]}を${nextAction.direction}。` : '三面図の現在形と基準形が近づきました。'}`,
      )
    } else if (change < -0.7) {
      setMoveFeedback(
        `適合度が${Math.abs(change).toFixed(1)}ポイント下がりました。${CONTROL_LABELS[control]}を前の位置へ戻し、優先順位の一番上を試します。`,
      )
      setHintLevel((current) => Math.max(current, 1))
    } else {
      setMoveFeedback(
        `${CONTROL_LABELS[control]}の変化は小さめです。形が動いた場所を確認し、次の優先操作へ進みます。`,
      )
    }

    if (nextMoves >= activeChallenge.moveBudget && nextResult.metrics.efficiency < 80) {
      setHintLevel((current) => Math.max(current, 2))
    }

    if (conditionsMatch && nextResult.metrics.efficiency >= activeChallenge.threshold) {
      setPhase('complete')
      setCourseNotice('目標範囲へ戻りました。操作、形、艇の状態を一つの因果として振り返ります。')
      recordCompletion(nextMoves)
    }
  }

  const tryBaseline = () => {
    setControls(result.targetControls)
    if (phase === 'practice') {
      setAssisted(true)
      setMoveFeedback('基準形を表示しました。自動で完了にはしません。形を観察した後、もう一度チャレンジしてください。')
    }
    setCourseNotice(
      '比較用の基準形状を入れました。大きな断面の現在線が基準帯へ入る様子を確認してください。',
    )
  }

  const showHint = () => {
    setHintLevel((current) => Math.min(activeChallenge.hints.length, current + 1))
    setAssisted(true)
  }

  const retryChallenge = () => {
    startChallenge()
  }

  const nextChallenge = () => {
    const activeIndex = TRIM_CHALLENGES.findIndex((challenge) => challenge.id === activeChallenge.id)
    const following = TRIM_CHALLENGES[(activeIndex + 1) % TRIM_CHALLENGES.length]
    selectChallenge(following.id)
  }

  const shareChallenge = async () => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    url.search = ''
    url.hash = ''
    url.searchParams.set('challenge', activeChallenge.id)

    try {
      await navigator.clipboard.writeText(url.toString())
      setShareStatus('共有URLをコピーしました。同じ崩れ方と問いを開けます。')
    } catch {
      const copyField = document.createElement('textarea')
      copyField.value = url.toString()
      copyField.style.position = 'fixed'
      copyField.style.opacity = '0'
      document.body.append(copyField)
      copyField.select()
      const copied = document.execCommand('copy')
      copyField.remove()
      setShareStatus(copied ? '共有URLをコピーしました。' : `共有URL: ${url.toString()}`)
    }
  }

  return (
    <div className="app-shell" id="top">
      <a className="skip-link" href="#simulator">セール形状モデルへスキップ</a>
      <Masthead
        boat={boat}
        lesson={`DRILL ${String(activeChallenge.order).padStart(2, '0')}`}
        lessonTitle={activeChallenge.title}
        onBoatChange={changeBoat}
      />

      <main>
        <section className="lesson-brief" aria-labelledby="lesson-title">
          <div>
            <span className="lesson-kicker">TODAY'S QUESTION / {activeChallenge.boat}</span>
            <h1 id="lesson-title">{activeChallenge.question}</h1>
          </div>
          <p>
            基本角度と艇の姿勢は自動で最適に保ちます。形を予想し、一本動かし、断面と速度で確かめます。
          </p>
          <div className="lesson-loop" aria-label="学習の流れ">
            <span>予想</span><i>→</i><span>動かす</span><i>→</i><span>形を見る</span><i>→</i><span>理由を言う</span>
          </div>
        </section>

        <section className="live-training-area" id="simulator" aria-label="セール形状とトリム操作">
          <div className="condition-bar">
            <CourseBoard
              angle={angle}
              windSpeed={windSpeed}
              onCourseChange={changeCourse}
              onWindChange={changeWind}
            />
          </div>

          <div className="trim-workbench">
            <div className="live-visual-column">
              <BoatView
                boat={boat}
                angle={angle}
                windSpeed={windSpeed}
                result={result}
                courseNotice={courseNotice}
                focusControl={lastControl}
                showTarget={showTarget}
                onToggleTarget={() => setShowTarget((shown) => !shown)}
              />
              <MetricsRail result={result} />
            </div>

            <div className="live-control-column">
              <div className="workbench-cue" aria-hidden="true">
                <span>一本動かす</span>
                <i>↔</i>
                <strong>形が変わる</strong>
              </div>
            <ControlPanel
              boat={boat}
              controls={controls}
              targets={result.targetControls}
              actions={result.actions}
              onControlChange={changeControl}
            />
              <CoachPanel
                guidance={result.guidance}
                efficiency={result.metrics.efficiency}
                actions={result.actions}
                onShowBaseline={tryBaseline}
              />
            </div>
          </div>
        </section>

        <section className="practice-library" aria-label="練習課題">
          <div className="practice-library-head">
            <span>AFTER THE SHAPE BENCH</span>
            <div>
              <h2>形が読めたら、課題で確かめる</h2>
              <p>まず上のモデルを自由に動かし、その後に予想 → 一本動かす → 理由を言う練習へ進みます。</p>
            </div>
          </div>
          <ChallengeDeck
            challenges={TRIM_CHALLENGES}
            active={activeChallenge}
            progress={progress}
            phase={phase}
            prediction={prediction}
            moveCount={moveCount}
            startEfficiency={startEfficiency}
            currentEfficiency={result.metrics.efficiency}
            hintLevel={hintLevel}
            moveFeedback={moveFeedback}
            shareStatus={shareStatus}
            assisted={assisted}
            onSelect={selectChallenge}
            onPredict={setPrediction}
            onStart={startChallenge}
            onHint={showHint}
            onRetry={retryChallenge}
            onNext={nextChallenge}
            onShare={shareChallenge}
          />
        </section>

        <section className="model-note" aria-label="モデルについて">
          <span>MODEL NOTE</span>
          <p>
            速度は上・中・下の断面から揚力・抗力・前進力を積分した学習用の推定値です。実測ポーラやCFDではありません。基本角度、艇バランス、センターボードは常に最適と仮定し、マスト曲がりは差を読み取れるよう強調表示します。
          </p>
        </section>

        <details className="method-note">
          <summary>詳しく見る：このモデルの考え方と参考資料</summary>
          <div>
            <p>
              一つの3Dセール面に上・中・下の断面形状とマストベンドを与え、上・斜め横・後ろの三台の正投影カメラで観察します。各断面の深さ・最大深さ位置・ツイストから揚力係数、抗力係数、前進力の代理値を積分し、推定艇速へ変換します。<strong>形状コントロール → 同じセール面 → 断面性能 → 推定艇速</strong>の因果を比べる準定常の学習モデルで、実艇の実測ポーラやCFDではありません。マスト曲がりの表示量は読み取り用に強調しており、チューニングゲージの実測mmとは対応しません。
            </p>
            <ul>
              <li><a href="https://www.northsails.co.jp/wordpress/wp-content/uploads/2026/03/420-M12-Tuning-Guide_j.pdf" target="_blank" rel="noreferrer">North Sails Japan — 420 M11 / M12 Tuning Guide</a></li>
              <li><a href="https://www.northsails.com/en-fr/blogs/north-sails-blog/420-tuning-guide" target="_blank" rel="noreferrer">North Sails — 420 Tuning Guide</a></li>
              <li><a href="https://www.northsails.com/en-ca/blogs/north-sails-blog/470-speed-guide" target="_blank" rel="noreferrer">North Sails — 470 Speed Guide</a></li>
              <li><a href="https://www.grc.nasa.gov/WWW/k-12/FoilSim/Manual/fsim0007.htm" target="_blank" rel="noreferrer">NASA Glenn — The Lift Coefficient</a></li>
              <li><a href="https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/induced-drag-coefficient/" target="_blank" rel="noreferrer">NASA Glenn — Induced Drag Coefficient</a></li>
              <li><a href="https://doksi.net/en/get.php?lid=34356" target="_blank" rel="noreferrer">Science of the 470 Sailing Performance — VPP / experimental study</a></li>
            </ul>
          </div>
        </details>
      </main>

      <footer>
        <span>TRIM NOTE / TRAINING BUILD 0.6</span>
        <span className="footer-credit">Created by Dit-Lab.</span>
        <p>タック、ジャイブ、レース戦術を扱わず、420 / 470のセール形状づくりに集中しています。</p>
      </footer>
    </div>
  )
}

export default App
