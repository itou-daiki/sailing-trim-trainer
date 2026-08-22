import type { BoatClass, TrimControls, TrimResult } from '../domain/types'

type BoatViewProps = {
  boat: BoatClass
  angle: number
  windSpeed: number
  controls: TrimControls
  result: TrimResult
  courseNotice: string
}

type ProjectionProps = {
  boat: BoatClass
  controls: TrimControls
  result: TrimResult
}

const pointFromAngle = (
  originX: number,
  originY: number,
  length: number,
  degrees: number,
) => {
  const radians = (degrees * Math.PI) / 180
  return {
    x: originX + Math.sin(radians) * length,
    y: originY + Math.cos(radians) * length,
  }
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

function ProjectionCaption({
  view,
  title,
  value,
}: {
  view: string
  title: string
  value: string
}) {
  return (
    <figcaption className="projection-caption">
      <span>{view}</span>
      <strong>{title}</strong>
      <small>{value}</small>
    </figcaption>
  )
}

function TopProjection({
  boat,
  angle,
  windSpeed,
  controls,
  result,
}: ProjectionProps & { angle: number; windSpeed: number }) {
  const mainEnd = pointFromAngle(260, 215, 196, result.actual.main.angle)
  const mainMid = pointFromAngle(260, 215, 105, result.actual.main.angle + 6)
  const jibEnd = pointFromAngle(260, 203, 108, result.actual.jib.angle)
  const crewY = 220 + (controls.crewForeAft - 50) * 1.35
  const crewX = 228 - controls.crewHike * 0.86
  const driveLength = 42 + result.metrics.drive * 0.8
  const sideLength = 15 + result.metrics.heel * 2.1

  return (
    <figure className="projection-frame projection-top">
      <ProjectionCaption
        view="01 / TOP"
        title="セール角度"
        value={`MAIN ${Math.round(result.actual.main.angle)}° · JIB ${Math.round(result.actual.jib.angle)}°`}
      />
      <svg viewBox="0 0 560 520" role="img" aria-label={`${boat}を上から見たセール角度と力の模式図`}>
        <defs>
          <marker id="force-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
          <marker id="side-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
          <marker id="wind-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
        </defs>

        <g className="water-traces" aria-hidden="true">
          <path d="M62 80H162M45 111H141M390 380H504M414 410H532M52 458H177" />
        </g>

        <g className="true-wind" transform={`rotate(${-angle + 14} 92 112)`}>
          {[0, 24, 48].map((offset) => (
            <path key={offset} d={`M${58 + offset} 166V58`} markerEnd="url(#wind-head)" />
          ))}
        </g>
        <text x="46" y="194" className="svg-caption">TRUE WIND {windSpeed} KT</text>

        <path
          className="hull-shadow"
          d="M260 52C224 87 219 354 248 454H272C301 354 296 87 260 52Z"
        />
        <path
          className="hull"
          d="M260 48C224 83 219 350 248 450H272C301 350 296 83 260 48Z"
        />
        <path className="cockpit" d="M238 238Q260 216 282 238L277 376Q260 396 243 376Z" />
        <path className="deck-line" d="M260 62V444M230 205H290" />
        <circle cx="260" cy="215" r="8" className="mast" />

        <path
          className="jib-sail"
          d={`M260 72L260 203Q${jibEnd.x - 20} ${jibEnd.y - 18} ${jibEnd.x} ${jibEnd.y}Z`}
        />
        <path
          className="main-sail"
          d={`M260 215Q${mainMid.x + 24} ${mainMid.y - 18} ${mainEnd.x} ${mainEnd.y}L${mainEnd.x - 8} ${mainEnd.y + 8}Q${mainMid.x} ${mainMid.y + 7} 260 232Z`}
        />
        <path className="boom" d={`M260 215L${mainEnd.x} ${mainEnd.y}`} />
        <path className="jib-foot" d={`M260 203L${jibEnd.x} ${jibEnd.y}`} />

        <g className={result.metrics.efficiency > 88 ? 'telltales is-flowing' : 'telltales'}>
          <path d={`M${jibEnd.x - 29} ${jibEnd.y - 20}l28 -2`} />
          <path d={`M${jibEnd.x - 38} ${jibEnd.y - 38}l27 5`} />
          <path d={`M${mainMid.x + 18} ${mainMid.y - 10}l30 2`} />
        </g>

        <g className="crew" transform={`translate(${crewX} ${crewY})`}>
          <circle cx="0" cy="0" r="14" />
          <circle cx="0" cy="38" r="12" />
          <text x="-23" y="5">H</text>
          <text x="-21" y="43">C</text>
        </g>
        <path className="hiking-line" d={`M236 ${crewY + 20}H${crewX}`} />

        <g className="force-vectors">
          <path d={`M275 272V${272 - driveLength}`} markerEnd="url(#force-arrow)" />
          <text x="286" y={250 - driveLength} className="force-label">前へ進む力</text>
          <path d={`M275 272H${275 + sideLength}`} markerEnd="url(#side-arrow)" />
          <text x={288 + sideLength} y="292" className="force-label">横へ押す力</text>
        </g>

        <text x="260" y="486" textAnchor="middle" className="boat-class-label">
          {boat} / STARBOARD TACK MODEL
        </text>
      </svg>

      <div className="canvas-key" aria-label="上面図の凡例">
        <span><i className="key-drive" />前へ進む力</span>
        <span><i className="key-side" />横へ押す力</span>
        <span><i className="key-sail" />現在のセール</span>
      </div>
    </figure>
  )
}

function SideProjection({ boat, controls, result }: ProjectionProps) {
  const main = result.actual.main
  const jib = result.actual.jib
  const mastBend = boat === '420'
    ? 5 + (100 - controls.chock) * 0.1
    : 7 + (controls.forePuller - controls.aftPuller) * 0.08
  const mastTopX = 188 + clamp(mastBend, -4, 18)
  const mainLevels = [76, 126, 176]
  const jibLevels = [105, 153]

  const mainStripe = (y: number) => {
    const ratio = (y - 34) / 168
    const luffX = mastTopX + (190 - mastTopX) * ratio
    const leechX = mastTopX + (360 - mastTopX) * ratio
    const chord = leechX - luffX
    const peakX = luffX + chord * main.draftPosition
    const bow = main.draftDepth * 150 * (0.82 + ratio * 0.2)
    return `M${luffX} ${y} Q${peakX} ${y + bow} ${leechX} ${y}`
  }

  const jibStripe = (y: number) => {
    const ratio = (y - 50) / 150
    const luffX = mastTopX + (68 - mastTopX) * ratio
    const leechX = mastTopX + (174 - mastTopX) * ratio
    const chord = leechX - luffX
    const peakX = luffX + chord * jib.draftPosition
    return `M${luffX} ${y} Q${peakX} ${y + jib.draftDepth * 120} ${leechX} ${y}`
  }

  return (
    <figure className="projection-frame projection-side">
      <ProjectionCaption
        view="02 / SIDE"
        title="ドラフト"
        value={`${(main.draftDepth * 100).toFixed(1)}% · 位置 ${Math.round(main.draftPosition * 100)}%`}
      />
      <svg viewBox="0 0 430 270" role="img" aria-label={`${boat}を横から見たセール全体とドラフトストライプ`}>
        <path className="side-waterline" d="M18 224H414" />
        <path className="side-hull-shadow" d="M38 207Q138 247 345 228L403 203Q310 215 82 199Z" />
        <path className="side-hull" d="M32 202Q132 239 339 222L397 198Q306 207 79 194Z" />
        <path className="side-cockpit" d="M167 199Q241 174 318 199" />

        <path className="side-jib" d={`M${mastTopX} 48L68 195L174 195Z`} />
        <path
          className="side-main"
          d={`M${mastTopX} 34Q${204 + mastBend} 105 190 202L360 202Q337 108 ${mastTopX} 34Z`}
        />
        <path className="side-mast-reference" d="M190 202V30" />
        <path className="side-mast" d={`M190 205Q${190 + mastBend * 0.25} 112 ${mastTopX} 29`} />
        <path className="side-boom" d="M190 202H363" />
        <path className="side-vang" d="M210 202L249 183" />
        <path className="side-forestay" d={`M${mastTopX} 45L67 197`} />

        <g className="draft-stripes draft-main">
          {mainLevels.map((level) => <path key={level} d={mainStripe(level)} />)}
        </g>
        <g className="draft-stripes draft-jib">
          {jibLevels.map((level) => <path key={level} d={jibStripe(level)} />)}
        </g>

        <g className="side-telltales">
          <path d="M320 108l23 4M339 155l24 2M351 190l23 1" />
        </g>

        <path className="shape-callout-line" d={`M${188 + (360 - 188) * main.draftPosition} 126L290 66H370`} />
        <circle
          className="shape-callout-dot"
          cx={188 + (360 - 188) * main.draftPosition}
          cy={126 + main.draftDepth * 150}
          r="4"
        />
        <text x="293" y="58" className="shape-callout">最大ドラフト位置</text>
        <text x="293" y="73" className="shape-callout-value">{Math.round(main.draftPosition * 100)}% LUFF</text>
        <text x="28" y="252" className="projection-note">曲線＝セール面のふくらみ / 3本を同時比較</text>
      </svg>
    </figure>
  )
}

function AftProjection({ controls, result }: ProjectionProps) {
  const main = result.actual.main
  const heel = clamp(result.metrics.heel, 0, 25)
  const boomProjection = clamp(18 + main.angle * 1.25, 25, 122)
  const middleProjection = clamp(12 + (main.angle + main.twist * 0.45) * 0.9, 20, 100)
  const upperProjection = clamp(7 + (main.angle + main.twist) * 0.62, 15, 82)
  const crewOffset = 28 + controls.crewHike * 0.63

  return (
    <figure className="projection-frame projection-aft">
      <ProjectionCaption
        view="03 / AFT"
        title="ツイストとヒール"
        value={`TWIST ${Math.round(main.twist)}° · HEEL ${Math.round(heel)}°`}
      />
      <svg viewBox="0 0 300 270" role="img" aria-label={`後ろから見たセールのツイストとヒール ${Math.round(heel)}度`}>
        <path className="aft-waterline" d="M12 220H288" />
        <path className="heel-reference" d="M150 214V34" />
        <path className="heel-arc" d={`M150 76A138 138 0 0 0 ${150 - heel * 1.8} ${78 + heel * 0.18}`} />
        <text x="26" y="70" className="heel-label">HEEL {Math.round(heel)}°</text>

        <g transform={`rotate(${-heel} 150 210)`} className="aft-heel-group">
          <path
            className="aft-main"
            d={`M150 36L150 202L${150 + boomProjection} 202Q${150 + middleProjection + 18} 128 ${150 + upperProjection} 62Q158 40 150 36Z`}
          />
          <path className="aft-mast" d="M150 210V31" />
          <path className="aft-boom" d={`M150 202H${150 + boomProjection + 4}`} />
          <path className="aft-leech" d={`M${150 + upperProjection} 62Q${150 + middleProjection + 18} 128 ${150 + boomProjection} 202`} />
          <g className="aft-stripes">
            <path d={`M150 82H${150 + upperProjection + 7}`} />
            <path d={`M150 132H${150 + middleProjection + 14}`} />
            <path d={`M150 181H${150 + boomProjection - 12}`} />
          </g>
          <path className="aft-hull-shadow" d="M86 194Q150 244 214 194L199 224Q150 249 101 224Z" />
          <path className="aft-hull" d="M83 188Q150 234 217 188L201 218Q150 241 99 218Z" />
          <path className="aft-deck" d="M91 191Q150 212 209 191" />
          <g className="aft-crew" transform={`translate(${-crewOffset} 187)`}>
            <circle cx="150" cy="0" r="11" />
            <circle cx="150" cy="24" r="9" />
          </g>
        </g>

        <path className="twist-callout" d={`M${150 + upperProjection} 64H267`} />
        <text x="207" y="56" className="shape-callout">上部が開く量</text>
        <text x="207" y="71" className="shape-callout-value">{Math.round(main.twist)}° TWIST</text>
        <text x="18" y="252" className="projection-note">水面は水平 / 艇とマストが一緒に傾く</text>
      </svg>
    </figure>
  )
}

export function BoatView({
  boat,
  angle,
  windSpeed,
  controls,
  result,
  courseNotice,
}: BoatViewProps) {
  return (
    <section className="boat-view" aria-labelledby="boat-view-title">
      <div className="boat-view-head">
        <div className="section-heading light-heading">
          <span className="section-index">B</span>
          <div>
            <p>LIVE THREE-VIEW</p>
            <h2 id="boat-view-title">角度と形を三方向から見る</h2>
          </div>
        </div>
        <div className="apparent-readout">
          <span>APPARENT</span>
          <strong>{Math.round(result.apparentWindAngle)}°</strong>
          <small>{result.apparentWindSpeed.toFixed(1)} kt</small>
        </div>
      </div>

      <div className="boat-canvas">
        <div className="projection-grid">
          <TopProjection
            boat={boat}
            angle={angle}
            windSpeed={windSpeed}
            controls={controls}
            result={result}
          />
          <SideProjection boat={boat} controls={controls} result={result} />
          <AftProjection boat={boat} controls={controls} result={result} />
        </div>
        <div className="projection-guide" aria-label="三面図で確認する項目">
          <span><strong>TOP</strong> シートで開く角度</span>
          <span><strong>SIDE</strong> ドラフトの深さと位置</span>
          <span><strong>AFT</strong> ツイストとヒール</span>
        </div>
      </div>

      <div className="course-notice" aria-live="polite">
        <span>COURSE CHANGE</span>
        <p>{courseNotice}</p>
      </div>
    </section>
  )
}
