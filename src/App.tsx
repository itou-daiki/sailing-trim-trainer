import { useMemo, useState } from 'react'
import { BoatView } from './components/BoatView'
import { CoachPanel } from './components/CoachPanel'
import { ControlPanel } from './components/ControlPanel'
import { CourseBoard } from './components/CourseBoard'
import { Masthead } from './components/Masthead'
import { MetricsRail } from './components/MetricsRail'
import { ShapeLab } from './components/ShapeLab'
import { BOATS } from './data/boats'
import { courseName } from './domain/course'
import { calculateTrim, targetControls } from './domain/trimModel'
import type { BoatClass, ControlKey, TrimControls } from './domain/types'

const INITIAL_ANGLE = 45
const INITIAL_WIND = 8

function App() {
  const [boat, setBoat] = useState<BoatClass>('420')
  const [angle, setAngle] = useState(INITIAL_ANGLE)
  const [windSpeed, setWindSpeed] = useState(INITIAL_WIND)
  const [controls, setControls] = useState<TrimControls>(() =>
    targetControls('420', INITIAL_ANGLE, INITIAL_WIND),
  )
  const [lastControl, setLastControl] = useState<ControlKey>('mainSheet')
  const [showTarget, setShowTarget] = useState(true)
  const [courseNotice, setCourseNotice] = useState(
    'クローズの基準トリムです。ビームを選び、シートを動かさずに変化を見てください。',
  )

  const result = useMemo(
    () => calculateTrim(boat, angle, windSpeed, controls),
    [angle, boat, controls, windSpeed],
  )

  const changeBoat = (nextBoat: BoatClass) => {
    setBoat(nextBoat)
    setControls(targetControls(nextBoat, angle, windSpeed))
    setCourseNotice(
      `${BOATS[nextBoat].name}へ切り替えました。現在の風に合う基準トリムから始めます。`,
    )
  }

  const changeCourse = (nextAngle: number) => {
    if (nextAngle === angle) return
    const before = courseName(angle)
    const after = courseName(nextAngle)
    setAngle(nextAngle)
    setCourseNotice(
      `${before}から${after}へ船首だけ変えました。まずメインとジブの風に対する角度を観察します。`,
    )
  }

  const changeWind = (nextWind: number) => {
    setWindSpeed(nextWind)
    setCourseNotice(
      `風速を${nextWind} ktへ変えました。コントロールはそのままです。ドラフト位置とヒールを見比べてください。`,
    )
  }

  const changeControl = (control: ControlKey, value: number) => {
    setLastControl(control)
    setControls((current) => ({ ...current, [control]: value }))
  }

  const tryBaseline = () => {
    setControls(result.targetControls)
    setCourseNotice(
      '比較用の基準トリムを入れました。断面の破線と現在形が重なる様子を確認してください。',
    )
  }

  return (
    <div className="app-shell" id="top">
      <Masthead boat={boat} onBoatChange={changeBoat} />

      <main>
        <section className="lesson-brief" aria-labelledby="lesson-title">
          <div>
            <span className="lesson-kicker">TODAY'S QUESTION</span>
            <h1 id="lesson-title">ベアしたのに、クローズのまま引いていないか。</h1>
          </div>
          <p>
            風向角が変わったら、セールにも新しい角度が必要です。まず予想し、一本動かし、形と艇速で確かめます。
          </p>
          <div className="lesson-loop" aria-label="学習の流れ">
            <span>予想</span><i>→</i><span>動かす</span><i>→</i><span>形を見る</span><i>→</i><span>理由を言う</span>
          </div>
        </section>

        <div className="upper-workspace">
          <CourseBoard
            angle={angle}
            windSpeed={windSpeed}
            onCourseChange={changeCourse}
            onWindChange={changeWind}
          />
          <BoatView
            boat={boat}
            angle={angle}
            windSpeed={windSpeed}
            controls={controls}
            result={result}
            courseNotice={courseNotice}
          />
          <div className="right-rail">
            <MetricsRail metrics={result.metrics} />
            <CoachPanel
              guidance={result.guidance}
              lastControl={lastControl}
              efficiency={result.metrics.efficiency}
              onShowBaseline={tryBaseline}
            />
          </div>
        </div>

        <div className="lower-workspace">
          <ShapeLab
            actual={result.actual}
            target={result.target}
            showTarget={showTarget}
            onToggleTarget={() => setShowTarget((shown) => !shown)}
          />
          <ControlPanel
            boat={boat}
            controls={controls}
            targets={result.targetControls}
            highlightedControl={result.guidance.control}
            onControlChange={changeControl}
          />
        </div>

        <section className="model-note" aria-label="モデルについて">
          <span>MODEL NOTE</span>
          <p>
            速度・ヒール・リーウェイは学習用の推定値です。波、クルー体重、個体差、セールカットで最適範囲は変わります。海上ではテルテール、舵の重さ、相手艇との比較を優先してください。
          </p>
        </section>

        <details className="method-note">
          <summary>詳しく見る：このモデルの考え方と参考資料</summary>
          <div>
            <p>
              このMVPはCFDではなく、<strong>操作 → セール形状 → 前進力／横力 → 艇速・ヒール・リーウェイ</strong>を即時に比べるための準定常モデルです。基準値は一点の正解ではなく、学習用の適正範囲として扱います。
            </p>
            <ul>
              <li><a href="https://www.northsails.com/en-fr/blogs/north-sails-blog/420-tuning-guide" target="_blank" rel="noreferrer">North Sails — 420 Tuning Guide</a></li>
              <li><a href="https://www.northsails.com/en-ca/blogs/north-sails-blog/470-speed-guide" target="_blank" rel="noreferrer">North Sails — 470 Speed Guide</a></li>
              <li><a href="https://doksi.net/en/get.php?lid=34356" target="_blank" rel="noreferrer">Science of the 470 Sailing Performance — VPP / experimental study</a></li>
            </ul>
          </div>
        </details>
      </main>

      <footer>
        <span>TRIM NOTE / MVP 0.1</span>
        <p>タック、ジャイブ、レース戦術を扱わず、セール形状と艇バランスの学習に集中しています。</p>
      </footer>
    </div>
  )
}

export default App
