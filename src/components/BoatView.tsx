import type { BoatClass, TrimControls, TrimResult } from '../domain/types'

type BoatViewProps = {
  boat: BoatClass
  angle: number
  windSpeed: number
  controls: TrimControls
  result: TrimResult
  courseNotice: string
}

const pointFromAngle = (originX: number, originY: number, length: number, degrees: number) => {
  const radians = (degrees * Math.PI) / 180
  return {
    x: originX + Math.sin(radians) * length,
    y: originY + Math.cos(radians) * length,
  }
}

export function BoatView({
  boat,
  angle,
  windSpeed,
  controls,
  result,
  courseNotice,
}: BoatViewProps) {
  const mainEnd = pointFromAngle(260, 215, 196, result.actual.main.angle)
  const mainMid = pointFromAngle(260, 215, 105, result.actual.main.angle + 6)
  const jibEnd = pointFromAngle(260, 203, 108, result.actual.jib.angle)
  const crewY = 220 + (controls.crewForeAft - 50) * 1.35
  const crewX = 228 - controls.crewHike * 0.86
  const driveLength = 42 + result.metrics.drive * 0.8
  const sideLength = 15 + result.metrics.heel * 2.1

  return (
    <section className="boat-view" aria-labelledby="boat-view-title">
      <div className="boat-view-head">
        <div className="section-heading light-heading">
          <span className="section-index">B</span>
          <div>
            <p>LIVE BOAT</p>
            <h2 id="boat-view-title">力の向きを見る</h2>
          </div>
        </div>
        <div className="apparent-readout">
          <span>APPARENT</span>
          <strong>{Math.round(result.apparentWindAngle)}°</strong>
          <small>{result.apparentWindSpeed.toFixed(1)} kt</small>
        </div>
      </div>

      <div className="boat-canvas">
        <svg viewBox="0 0 560 520" role="img" aria-label={`${boat}のセール、風、力の模式図`}>
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

        <div className="canvas-key" aria-label="図の凡例">
          <span><i className="key-drive" />前へ進む力</span>
          <span><i className="key-side" />横へ押す力</span>
          <span><i className="key-sail" />現在のセール</span>
        </div>
      </div>

      <div className="course-notice" aria-live="polite">
        <span>COURSE CHANGE</span>
        <p>{courseNotice}</p>
      </div>
    </section>
  )
}
