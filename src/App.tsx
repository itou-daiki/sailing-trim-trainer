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
import { actionPriority, keepActionPriority } from './domain/actionPriority'
import { buildChallengeSetup, getChallenge, TRIM_CHALLENGES } from './domain/challenges'
import type { PredictionConfidence, ShapeEvidence } from './domain/challenges'
import { courseName } from './domain/course'
import { labSnapshotUrl, parseLabSnapshot } from './domain/labShare'
import { loadProgress, saveProgress, updateRecord } from './domain/progress'
import type { ControlMove } from './domain/shapeComparison'
import {
  calculateTrim,
  CONTROL_LABELS,
  guidanceForActions,
  targetControls,
} from './domain/trimModel'
import type { BoatClass, ControlKey, TrimControls } from './domain/types'

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
  const challengeSetup = buildChallengeSetup(challenge)
  const shared = typeof window === 'undefined'
    ? undefined
    : parseLabSnapshot(window.location.search)
  const boat = shared?.boat ?? challengeSetup.boat
  const angle = shared?.angle ?? challengeSetup.angle
  const windSpeed = shared?.windSpeed ?? challengeSetup.windSpeed
  return {
    challenge,
    shared,
    boat,
    angle,
    windSpeed,
    controls: shared?.controls ?? challengeSetup.controls,
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
  const [establishedActionOrder, setEstablishedActionOrder] = useState<ControlKey[]>(() =>
    actionPriority(
      calculateTrim(initial.boat, initial.angle, initial.windSpeed, initial.controls).actions,
    ),
  )
  const [previousControls, setPreviousControls] = useState<TrimControls>(initial.controls)
  const [lastControl, setLastControl] = useState<ControlKey>('cunningham')
  const [lastMove, setLastMove] = useState<ControlMove>()
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('target')
  const [labShareStatus, setLabShareStatus] = useState('')
  const [workspaceMode, setWorkspaceMode] = useState<'challenge' | 'free' | 'shared'>(initial.shared ? 'shared' : 'challenge')
  const [phase, setPhase] = useState<ChallengePhase>('preview')
  const [prediction, setPrediction] = useState<ControlKey>()
  const [confidence, setConfidence] = useState<PredictionConfidence>()
  const [evidenceAnswer, setEvidenceAnswer] = useState<ShapeEvidence>()
  const [moveCount, setMoveCount] = useState(0)
  const [startEfficiency, setStartEfficiency] = useState(100)
  const [hintLevel, setHintLevel] = useState(0)
  const [moveFeedback, setMoveFeedback] = useState('')
  const [assisted, setAssisted] = useState(false)
  const [shareStatus, setShareStatus] = useState('')
  const [progress, setProgress] = useState(() => loadProgress(browserStorage()))
  const [courseNotice, setCourseNotice] = useState(initial.shared
    ? `共有された${initial.boat}の形を読み込みました。三面図と断面を見ながら、同じ条件から比較できます。`
    : `真風角${initial.angle}° / ${initial.windSpeed} kt。予想用にあえて崩した形を表示しています。`)
  const controlStartRef = useRef<{ control: ControlKey; controls: TrimControls } | undefined>(undefined)

  const result = useMemo(
    () => calculateTrim(boat, angle, windSpeed, controls),
    [angle, boat, controls, windSpeed],
  )
  const previousResult = useMemo(
    () => calculateTrim(boat, angle, windSpeed, previousControls),
    [angle, boat, previousControls, windSpeed],
  )
  const displayedActions = useMemo(
    () => keepActionPriority(result.actions, establishedActionOrder),
    [establishedActionOrder, result.actions],
  )
  const displayedGuidance = useMemo(
    () => guidanceForActions(
      boat,
      controls,
      result.targetControls,
      result.metrics.efficiency,
      displayedActions,
    ),
    [boat, controls, displayedActions, result.metrics.efficiency, result.targetControls],
  )
  const challengeMode = workspaceMode === 'challenge'
  const previewingChallenge = challengeMode && phase === 'preview'
  const controlLocked = challengeMode && phase !== 'practice'

  useEffect(() => {
    saveProgress(progress, browserStorage())
  }, [progress])

  const resetAttemptState = () => {
    setPhase('preview')
    setPrediction(undefined)
    setConfidence(undefined)
    setEvidenceAnswer(undefined)
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

  const establishActionOrder = (
    nextBoat: BoatClass,
    nextAngle: number,
    nextWindSpeed: number,
    nextControls: TrimControls,
  ) => {
    setEstablishedActionOrder(
      actionPriority(
        calculateTrim(nextBoat, nextAngle, nextWindSpeed, nextControls).actions,
      ),
    )
  }

  const selectChallenge = (id: string) => {
    const nextChallenge = getChallenge(id)
    if (!nextChallenge) return
    const setup = buildChallengeSetup(nextChallenge)
    setActiveChallengeId(nextChallenge.id)
    setWorkspaceMode('challenge')
    setBoat(setup.boat)
    setAngle(setup.angle)
    setWindSpeed(setup.windSpeed)
    setControls(setup.controls)
    establishActionOrder(setup.boat, setup.angle, setup.windSpeed, setup.controls)
    resetShapeHistory(setup.controls)
    setLastControl(nextChallenge.prediction.correctControl)
    setCourseNotice(
      `${BOATS[nextChallenge.boat].name} / 真風角${setup.angle}° / ${setup.windSpeed} kt。予想用にあえて崩した形を表示しています。`,
    )
    resetAttemptState()
  }

  const recordCompletion = (moves: number) => {
    setProgress((current) => updateRecord(current, activeChallenge.id, (record) => ({
      ...record,
      completed: true,
      assisted: record.assisted || assisted,
      bestMoves: record.bestMoves === undefined ? moves : Math.min(record.bestMoves, moves),
      evidenceCorrect: true,
    })))
  }

  const startChallenge = () => {
    if (!prediction || !confidence) return
    const setup = buildChallengeSetup(activeChallenge)
    const startingResult = calculateTrim(setup.boat, setup.angle, setup.windSpeed, setup.controls)
    setBoat(setup.boat)
    setWorkspaceMode('challenge')
    setAngle(setup.angle)
    setWindSpeed(setup.windSpeed)
    setControls(setup.controls)
    establishActionOrder(setup.boat, setup.angle, setup.windSpeed, setup.controls)
    resetShapeHistory(setup.controls)
    setLastControl(activeChallenge.prediction.correctControl)
    setPhase('practice')
    setMoveCount(0)
    setStartEfficiency(startingResult.metrics.efficiency)
    const predictionCorrect = prediction === activeChallenge.prediction.correctControl
    const highConfidenceMiss = !predictionCorrect && confidence === 'certain'
    setHintLevel(highConfidenceMiss ? 1 : 0)
    setMoveFeedback(highConfidenceMiss
      ? `確信していた予想と形の因果が異なりました。まず観察場所を一つに絞ります：${activeChallenge.hints[0]}`
      : '予想を残しました。優先順位の一番上を一本だけ動かし、大きな断面図の差を確かめます。')
    setAssisted(false)
    setCourseNotice(
      `${activeChallenge.boat} / 真風角 ${setup.angle}° / ${setup.windSpeed} kt。あえて崩れたトリムから始めます。`,
    )
    setProgress((current) => updateRecord(current, activeChallenge.id, (record) => ({
      ...record,
      attempts: record.attempts + 1,
      predictionCorrect,
      predictionConfidence: confidence,
    })))
  }

  const changeBoat = (nextBoat: BoatClass) => {
    const nextControls = targetControls(nextBoat, angle, windSpeed)
    setBoat(nextBoat)
    setControls(nextControls)
    establishActionOrder(nextBoat, angle, windSpeed, nextControls)
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
    establishActionOrder(boat, nextAngle, windSpeed, controls)
    resetShapeHistory(controls)
    setCourseNotice(
      `${before}から${after}へ変更。艇速を含む見かけ風へ基本角度が追従しました。深さ・位置・ツイストを作り直します。`,
    )
    if (phase === 'practice' && nextAngle !== activeChallenge.setup.angle) {
      setMoveFeedback(`指定条件は真風角${activeChallenge.setup.angle}°です。条件を変えた試行は自由練習として扱います。`)
    }
  }

  const changeWind = (nextWind: number) => {
    setWindSpeed(nextWind)
    establishActionOrder(boat, angle, nextWind, controls)
    resetShapeHistory(controls)
    setCourseNotice(
      `風速を${nextWind} ktへ変更。見かけ風とブーム角も再計算しました。次にドラフト深さ・位置・ツイストの差を見ます。`,
    )
    if (phase === 'practice' && nextWind !== activeChallenge.setup.windSpeed) {
      setMoveFeedback(`指定条件は${activeChallenge.setup.windSpeed} ktです。条件を戻すと到達判定が再開します。`)
    }
  }

  const beginControlChange = (control: ControlKey) => {
    if (displayedActions.length === 0) setEstablishedActionOrder([])
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
    const nextActionOrder = establishedActionOrder.length > 0 && displayedActions.length > 0
      ? establishedActionOrder
      : actionPriority(nextResult.actions)
    if (
      (establishedActionOrder.length === 0 || displayedActions.length === 0) &&
      nextActionOrder.length > 0
    ) {
      setEstablishedActionOrder(nextActionOrder)
    }
    const nextMoves = moveCount + 1
    const change = nextResult.metrics.efficiency - result.metrics.efficiency
    const nextAction = keepActionPriority(nextResult.actions, nextActionOrder)[0]
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
      setPhase('reflect')
      setEvidenceAnswer(undefined)
      setCourseNotice('目標範囲へ戻りました。最後に、どの形が変わったかを操作前と比べます。')
    }
  }

  const tryBaseline = () => {
    setPreviousControls(controls)
    setControls(result.targetControls)
    establishActionOrder(boat, angle, windSpeed, result.targetControls)
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

  const choosePrediction = (control: ControlKey) => {
    setPrediction(control)
    setConfidence(undefined)
  }

  const finishReflection = () => {
    if (evidenceAnswer !== activeChallenge.evidence.correct) return
    setPhase('complete')
    setCourseNotice('操作と形の変化を一つの因果として説明できました。')
    recordCompletion(moveCount)
  }

  const enterFreeLab = () => {
    const nextControls = targetControls(boat, angle, windSpeed)
    setWorkspaceMode('free')
    setControls(nextControls)
    establishActionOrder(boat, angle, windSpeed, nextControls)
    resetShapeHistory(nextControls)
    setCourseNotice('自由練習です。風と艇種を変え、一本ずつ動かして形の応答を見ます。')
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
        lesson={workspaceMode === 'shared' ? 'SHARED LAB' : workspaceMode === 'free' ? 'FREE LAB' : `DRILL ${String(activeChallenge.order).padStart(2, '0')}`}
        lessonTitle={workspaceMode === 'shared' ? '共有されたセール形状' : workspaceMode === 'free' ? '自由練習' : activeChallenge.title}
        locked={challengeMode}
        onBoatChange={changeBoat}
      />

      <main>
        <section className="lesson-brief" aria-labelledby="lesson-title">
          <div>
            <span className="lesson-kicker">{workspaceMode === 'shared' ? `SHARED SHAPE / ${boat}` : workspaceMode === 'free' ? `FREE SHAPE LAB / ${boat}` : `TODAY'S QUESTION / ${activeChallenge.boat}`}</span>
            <h1 id="lesson-title">{workspaceMode === 'shared' ? `${boat}・${windSpeed} kt・TWA ${angle}°の形を同じ条件で比較する` : workspaceMode === 'free' ? '風を変え、形状コントロールの効き方を自由に確かめる' : activeChallenge.question}</h1>
          </div>
          <p>
            {workspaceMode === 'shared'
              ? '艇種・風・形状コントロールを共有URLから復元しました。一本動かし、操作前との差を話し合えます。'
              : workspaceMode === 'free'
                ? '艇速を含む見かけ風へ基本角度が自動追従。深さ・最大位置・ツイストの変化へ集中できます。'
              : '基本角度は見かけ風へ自動追従し、艇の姿勢は最適に保ちます。形を予想し、一本動かし、断面と速度で確かめます。'}
          </p>
          <div className="lesson-loop" aria-label="学習の流れ">
            <span>予想</span><i>→</i><span>動かす</span><i>→</i><span>形を見る</span><i>→</i><span>形で説明</span>
            <button type="button" className="mode-switch" onClick={challengeMode ? enterFreeLab : () => selectChallenge(activeChallenge.id)}>
              {challengeMode ? '自由練習へ' : '課題に戻る'}
            </button>
          </div>
        </section>

        <section className="live-training-area" id="simulator" aria-label="セール形状とトリム操作">
          <div className="condition-bar">
            <CourseBoard
              angle={angle}
              windSpeed={windSpeed}
              apparentWindAngle={result.apparentWindAngle}
              apparentWindSpeed={result.apparentWindSpeed}
              boomAngle={result.actual.main.angle}
              mainTrimLabel={result.mainTrim.label}
              locked={challengeMode}
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
              actions={displayedActions}
              locked={controlLocked}
              revealGuidance={!previewingChallenge}
              onControlChangeStart={beginControlChange}
              onControlChange={changeControl}
            />
              <CoachPanel
                guidance={displayedGuidance}
                efficiency={result.metrics.efficiency}
                actions={displayedActions}
                mode={previewingChallenge ? 'observe' : 'guide'}
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
              <p>基礎1–3 → 420 / 470固有4–8 → 別コースへ使い直す9の順で、予想と形の根拠を練習します。</p>
            </div>
          </div>
          <ChallengeDeck
            challenges={TRIM_CHALLENGES}
            active={activeChallenge}
            progress={progress}
            phase={phase}
            prediction={prediction}
            confidence={confidence}
            evidenceAnswer={evidenceAnswer}
            moveCount={moveCount}
            startEfficiency={startEfficiency}
            currentEfficiency={result.metrics.efficiency}
            hintLevel={hintLevel}
            moveFeedback={moveFeedback}
            shareStatus={shareStatus}
            assisted={assisted}
            onSelect={selectChallenge}
            onPredict={choosePrediction}
            onConfidence={setConfidence}
            onStart={startChallenge}
            onHint={showHint}
            onRetry={retryChallenge}
            onEvidence={setEvidenceAnswer}
            onFinishReflection={finishReflection}
            onNext={nextChallenge}
            onShare={shareChallenge}
          />
        </section>

        <section className="model-note" aria-label="モデルについて">
          <span>MODEL NOTE</span>
          <p>
            ジブは固定ラフを軸に動き、ラフ・リーチ・フット三辺を維持します。メイン基本角は艇速と真風から見かけ風を反復計算し、クラス別クローズ基準・迎角15°・シュラウド上限を連続接続します。速度は上・中・下の断面から揚力・抗力・前進力を積分した学習用の推定値で、実測ポーラやCFDではありません。艇バランスとセンターボードは常に最適と仮定します。
          </p>
        </section>

        <details className="method-note">
          <summary>詳しく見る：このモデルの考え方と参考資料</summary>
          <div>
            <p>
              一つの3Dセール面に上・中・下の計測断面とマストベンドを与え、その間を全高へ連続させ、上・斜め横・実際のブーム方位に追従する後端カメラで観察します。後端ビューは小さなドラフト差を読めるよう深さ方向だけ3倍表示です。マストヒール、メイン下部点、ジブ揚程、船首取付点は420 / 470それぞれの公式寸法から同じ座標系へ置き、マストはクラス規則内の実寸楕円断面を持つ閉じた立体スパー、ジブは固定ラフの局所基底で回転しながらクラス規則の三辺長とトップ幅を維持する面として生成します。艇速と真風のベクトルから見かけ風を反復計算し、クローズはNorthのクラス別基準、リーチは見かけ風に対する迎角15°、ブロードはシュラウド位置を上限としてメイン角を連続計算します。各断面の深さ・最大深さ位置・ツイストから揚力係数、抗力係数、見かけ風方向の前進力代理値を積分し、推定艇速へ変換します。<strong>真風＋艇速 → 見かけ風 → 基本角度／形状 → 断面性能 → 推定艇速</strong>を反復する準定常の学習モデルで、実艇の実測ポーラやCFDではありません。マスト曲がりは操作量をクラス規則の最大曲率40 mm以内へ換算して表示します。
            </p>
            <ul>
              <li><a href="https://www.northsails.co.jp/wordpress/wp-content/uploads/2026/03/420-M12-Tuning-Guide_j.pdf" target="_blank" rel="noreferrer">North Sails Japan — 420 M11 / M12 Tuning Guide</a></li>
              <li><a href="https://www.northsails.com/en-fr/blogs/north-sails-blog/420-tuning-guide" target="_blank" rel="noreferrer">North Sails — 420 Tuning Guide</a></li>
              <li><a href="https://www.northsails.com/en-ca/blogs/north-sails-blog/470-speed-guide" target="_blank" rel="noreferrer">North Sails — 470 Speed Guide</a></li>
              <li><a href="https://www.northsails.com/products/470-n17-l26-mainsail" target="_blank" rel="noreferrer">North Sails — 470 N17-L26 Mainsail</a></li>
              <li><a href="https://media.sailing.org/sailing/wp-content/uploads/2022/03/17092130/420_CR_2026-03-31.pdf" target="_blank" rel="noreferrer">World Sailing — International 420 Class Rules 2026</a></li>
              <li><a href="https://media.sailing.org/sailing/wp-content/uploads/2022/07/02133245/420_BuildingSpec_2022-09Sep-01.pdf" target="_blank" rel="noreferrer">World Sailing — 420 Building Specification, Drawing 5 Issue J</a></li>
              <li><a href="https://www.sailing.org/wp-content/uploads/2022/03/470_CR_2025-09-01-II.pdf" target="_blank" rel="noreferrer">World Sailing — International 470 Class Rules 2025</a></li>
              <li><a href="https://media.sailing.org/sailing/wp-content/uploads/2023/01/19160058/470_005_080623_GA.pdf" target="_blank" rel="noreferrer">World Sailing — 470 Building Specification Plan 2023</a></li>
              <li><a href="https://media.sailing.org/sailing/wp-content/uploads/2024/06/04011421/Equipment-Rules-of-Sailing-2025-2028-v.2.pdf" target="_blank" rel="noreferrer">World Sailing — Equipment Rules of Sailing 2025–2028</a></li>
              <li><a href="https://cmst.curtin.edu.au/products/sailtool-software/" target="_blank" rel="noreferrer">Curtin University CMST — SailTool / draft stripe measurement</a></li>
              <li><a href="https://northu.com/sail-trim-simulator-user-guide/" target="_blank" rel="noreferrer">North U — Sail Trim Simulator User Guide</a></li>
              <li><a href="https://github.com/flyinggorilla/simulator.atterwind.info" target="_blank" rel="noreferrer">Atterwind — model assumptions and shareable views</a></li>
              <li><a href="https://www.nauticed.org/sailing-simulator" target="_blank" rel="noreferrer">NauticEd NED — wind-angle trim and efficiency feedback</a></li>
              <li><a href="https://americansailing.com/apps/sailing-challenge-app/" target="_blank" rel="noreferrer">ASA Sailing Challenge — apparent wind and trim modules</a></li>
              <li><a href="https://sailaway.world/aboutsa3" target="_blank" rel="noreferrer">Sailaway — visible airflow and real-time sail trim</a></li>
              <li><a href="https://www.grc.nasa.gov/WWW/k-12/FoilSim/Manual/fsim0007.htm" target="_blank" rel="noreferrer">NASA Glenn — The Lift Coefficient</a></li>
              <li><a href="https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/induced-drag-coefficient/" target="_blank" rel="noreferrer">NASA Glenn — Induced Drag Coefficient</a></li>
              <li><a href="https://doksi.net/en/get.php?lid=34356" target="_blank" rel="noreferrer">Science of the 470 Sailing Performance — VPP / experimental study</a></li>
            </ul>
          </div>
        </details>
      </main>

      <footer>
        <span>TRIM NOTE / TRAINING BUILD 0.13.5</span>
        <span className="footer-credit">Created by Dit-Lab.</span>
        <p>タック、ジャイブ、レース戦術を扱わず、420 / 470のセール形状づくりに集中しています。</p>
      </footer>
    </div>
  )
}

export default App
