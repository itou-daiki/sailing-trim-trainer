import { useEffect, useMemo, useRef, useState } from 'react'
import { BoatView } from './components/BoatView'
import type { ComparisonMode } from './components/BoatView'
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
import { labSnapshotUrl, parseLabSnapshot } from './domain/labShare'
import { loadProgress, saveProgress, updateRecord } from './domain/progress'
import type { ControlMove } from './domain/shapeComparison'
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

function initialSetup() {
  const challenge = challengeFromUrl()
  const shared = typeof window === 'undefined'
    ? undefined
    : parseLabSnapshot(window.location.search)
  const boat = shared?.boat ?? challenge.boat
  const angle = shared?.angle ?? INITIAL_ANGLE
  const windSpeed = shared?.windSpeed ?? INITIAL_WIND
  return {
    challenge,
    shared,
    boat,
    angle,
    windSpeed,
    controls: shared?.controls ?? targetControls(boat, angle, windSpeed),
  }
}

function App() {
  const [initial] = useState(initialSetup)
  const [activeChallengeId, setActiveChallengeId] = useState(initial.challenge.id)
  const activeChallenge = getChallenge(activeChallengeId) ?? TRIM_CHALLENGES[0]
  const [boat, setBoat] = useState<BoatClass>(initial.boat)
  const [angle, setAngle] = useState(initial.angle)
  const [windSpeed, setWindSpeed] = useState(initial.windSpeed)
  const [controls, setControls] = useState<TrimControls>(initial.controls)
  const [previousControls, setPreviousControls] = useState<TrimControls>(initial.controls)
  const [lastControl, setLastControl] = useState<ControlKey>('cunningham')
  const [lastMove, setLastMove] = useState<ControlMove>()
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('target')
  const [labShareStatus, setLabShareStatus] = useState('')
  const [labMode, setLabMode] = useState(Boolean(initial.shared))
  const [phase, setPhase] = useState<ChallengePhase>('preview')
  const [prediction, setPrediction] = useState<ControlKey>()
  const [moveCount, setMoveCount] = useState(0)
  const [startEfficiency, setStartEfficiency] = useState(100)
  const [hintLevel, setHintLevel] = useState(0)
  const [moveFeedback, setMoveFeedback] = useState('')
  const [assisted, setAssisted] = useState(false)
  const [shareStatus, setShareStatus] = useState('')
  const [progress, setProgress] = useState(() => loadProgress(browserStorage()))
  const [courseNotice, setCourseNotice] = useState(initial.shared
    ? `共有された${initial.boat}の形を読み込みました。三面図と断面を見ながら、同じ条件から比較できます。`
    : '基本角度・艇バランス・センターボードは自動で最適です。風を変え、形状コントロールだけを作り直します。')
  const controlStartRef = useRef<{ control: ControlKey; controls: TrimControls } | undefined>(undefined)

  const result = useMemo(
    () => calculateTrim(boat, angle, windSpeed, controls),
    [angle, boat, controls, windSpeed],
  )
  const previousResult = useMemo(
    () => calculateTrim(boat, angle, windSpeed, previousControls),
    [angle, boat, previousControls, windSpeed],
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

  const resetShapeHistory = (nextControls: TrimControls) => {
    controlStartRef.current = undefined
    setPreviousControls(nextControls)
    setLastMove(undefined)
    setComparisonMode('target')
    setLabShareStatus('')
  }

  const selectChallenge = (id: string) => {
    const nextChallenge = getChallenge(id)
    if (!nextChallenge) return
    setActiveChallengeId(nextChallenge.id)
    setLabMode(false)
    setBoat(nextChallenge.boat)
    const nextControls = targetControls(nextChallenge.boat, angle, windSpeed)
    setControls(nextControls)
    resetShapeHistory(nextControls)
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
    setLabMode(false)
    setAngle(setup.angle)
    setWindSpeed(setup.windSpeed)
    setControls(setup.controls)
    resetShapeHistory(setup.controls)
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
    const nextControls = targetControls(nextBoat, angle, windSpeed)
    setBoat(nextBoat)
    setControls(nextControls)
    resetShapeHistory(nextControls)
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
    resetShapeHistory(controls)
    setCourseNotice(
      `${before}から${after}へ変更。基本角度は自動で合いました。深さ・位置・ツイストだけを作り直します。`,
    )
    if (phase === 'practice' && nextAngle !== activeChallenge.setup.angle) {
      setMoveFeedback(`指定条件は真風角${activeChallenge.setup.angle}°です。条件を変えた試行は自由練習として扱います。`)
    }
  }

  const changeWind = (nextWind: number) => {
    setWindSpeed(nextWind)
    resetShapeHistory(controls)
    setCourseNotice(
      `風速を${nextWind} ktへ変更。艇は水平のまま、ドラフト深さ・位置・ツイストの差を見ます。`,
    )
    if (phase === 'practice' && nextWind !== activeChallenge.setup.windSpeed) {
      setMoveFeedback(`指定条件は${activeChallenge.setup.windSpeed} ktです。条件を戻すと到達判定が再開します。`)
    }
  }

  const beginControlChange = (control: ControlKey) => {
    controlStartRef.current = { control, controls }
    setPreviousControls(controls)
    setLastControl(control)
    setLastMove(undefined)
    setComparisonMode('target')
    setLabShareStatus('')
  }

  const changeControl = (control: ControlKey, value: number) => {
    const nextControls = { ...controls, [control]: value }
    const baseline = controlStartRef.current?.control === control
      ? controlStartRef.current.controls
      : controls
    setPreviousControls(baseline)
    setLastControl(control)
    setLastMove({
      control,
      from: baseline[control],
      to: value,
    })
    setComparisonMode('previous')
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
    setPreviousControls(controls)
    setControls(result.targetControls)
    setLastMove(undefined)
    setComparisonMode('target')
    setLabShareStatus('')
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

  const shareCurrentShape = async () => {
    if (typeof window === 'undefined') return
    const url = labSnapshotUrl(window.location.href, { boat, angle, windSpeed, controls })

    try {
      await navigator.clipboard.writeText(url)
      setLabShareStatus('この風・艇種・各コントロール値のURLをコピーしました。')
    } catch {
      const copyField = document.createElement('textarea')
      copyField.value = url
      copyField.style.position = 'fixed'
      copyField.style.opacity = '0'
      document.body.append(copyField)
      copyField.select()
      const copied = document.execCommand('copy')
      copyField.remove()
      setLabShareStatus(copied ? 'この形のURLをコピーしました。' : `共有URL: ${url}`)
    }
  }

  return (
    <div className="app-shell" id="top">
      <a className="skip-link" href="#simulator">セール形状モデルへスキップ</a>
      <Masthead
        boat={boat}
        lesson={labMode ? 'SHARED LAB' : `DRILL ${String(activeChallenge.order).padStart(2, '0')}`}
        lessonTitle={labMode ? '共有されたセール形状' : activeChallenge.title}
        onBoatChange={changeBoat}
      />

      <main>
        <section className="lesson-brief" aria-labelledby="lesson-title">
          <div>
            <span className="lesson-kicker">{labMode ? `SHARED SHAPE / ${boat}` : `TODAY'S QUESTION / ${activeChallenge.boat}`}</span>
            <h1 id="lesson-title">{labMode ? `${boat}・${windSpeed} kt・TWA ${angle}°の形を同じ条件で比較する` : activeChallenge.question}</h1>
          </div>
          <p>
            {labMode
              ? '艇種・風・形状コントロールを共有URLから復元しました。一本動かし、操作前との差を話し合えます。'
              : '基本角度と艇の姿勢は自動で最適に保ちます。形を予想し、一本動かし、断面と速度で確かめます。'}
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
                previousResult={previousResult}
                courseNotice={courseNotice}
                focusControl={lastControl}
                comparisonMode={comparisonMode}
                hasPrevious={Boolean(lastMove)}
                lastMove={lastMove}
                shareStatus={labShareStatus}
                onComparisonModeChange={setComparisonMode}
                onShareShape={shareCurrentShape}
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
              onControlChangeStart={beginControlChange}
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
              <li><a href="https://cmst.curtin.edu.au/products/sailtool-software/" target="_blank" rel="noreferrer">Curtin University CMST — SailTool / draft stripe measurement</a></li>
              <li><a href="https://northu.com/sail-trim-simulator-user-guide/" target="_blank" rel="noreferrer">North U — Sail Trim Simulator User Guide</a></li>
              <li><a href="https://github.com/flyinggorilla/simulator.atterwind.info" target="_blank" rel="noreferrer">Atterwind — model assumptions and shareable views</a></li>
              <li><a href="https://www.grc.nasa.gov/WWW/k-12/FoilSim/Manual/fsim0007.htm" target="_blank" rel="noreferrer">NASA Glenn — The Lift Coefficient</a></li>
              <li><a href="https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/induced-drag-coefficient/" target="_blank" rel="noreferrer">NASA Glenn — Induced Drag Coefficient</a></li>
              <li><a href="https://doksi.net/en/get.php?lid=34356" target="_blank" rel="noreferrer">Science of the 470 Sailing Performance — VPP / experimental study</a></li>
            </ul>
          </div>
        </details>
      </main>

      <footer>
        <span>TRIM NOTE / TRAINING BUILD 0.7</span>
        <span className="footer-credit">Created by Dit-Lab.</span>
        <p>タック、ジャイブ、レース戦術を扱わず、420 / 470のセール形状づくりに集中しています。</p>
      </footer>
    </div>
  )
}

export default App
