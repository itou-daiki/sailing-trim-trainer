import { courseName } from '../domain/course'

type CourseBoardProps = {
  angle: number
  windSpeed: number
  onCourseChange: (angle: number) => void
  onWindChange: (speed: number) => void
}

const COURSES = [
  { angle: 45, jp: 'クローズ', en: 'CLOSE' },
  { angle: 90, jp: 'ビーム', en: 'BEAM' },
  { angle: 140, jp: 'ブロード', en: 'BROAD' },
]

export function CourseBoard({
  angle,
  windSpeed,
  onCourseChange,
  onWindChange,
}: CourseBoardProps) {
  return (
    <section className="course-board" aria-labelledby="course-title">
      <div className="section-heading">
        <span className="section-index">A</span>
        <div>
          <p>WIND &amp; COURSE</p>
          <h2 id="course-title">風を変える</h2>
        </div>
      </div>

      <div className="wind-dial" aria-hidden="true">
        <svg viewBox="0 0 180 180" role="img" aria-label={`真風角 ${angle}度`}>
          <circle cx="90" cy="90" r="66" className="dial-ring" />
          <path d="M90 18V32M24 90H38M142 90H156" className="dial-tick" />
          <path d="M90 42L84 56H96Z" className="boat-nose" />
          <path d="M84 56L78 126H102L96 56Z" className="boat-mini" />
          <g transform={`rotate(${-angle} 90 90)`}>
            <path d="M90 154V64" className="wind-arrow" />
            <path d="M78 78L90 62L102 78" className="wind-arrow" />
          </g>
          <text x="90" y="102" textAnchor="middle" className="dial-value">
            {angle}°
          </text>
        </svg>
        <div>
          <span>TRUE WIND ANGLE</span>
          <strong>{courseName(angle)}</strong>
        </div>
      </div>

      <div className="course-presets">
        {COURSES.map((course) => (
          <button
            key={course.angle}
            type="button"
            className={Math.abs(angle - course.angle) < 10 ? 'is-active' : ''}
            onClick={() => onCourseChange(course.angle)}
          >
            <span>{course.angle}°</span>
            <strong>{course.jp}</strong>
            <small>{course.en}</small>
          </button>
        ))}
      </div>

      <label className="field-range" htmlFor="wind-angle">
        <span>
          <strong>風向角</strong>
          <output>{angle}°</output>
        </span>
        <input
          id="wind-angle"
          type="range"
          min="40"
          max="150"
          value={angle}
          onInput={(event) => onCourseChange(Number(event.currentTarget.value))}
        />
        <small><span>上る</span><span>ベアする</span></small>
      </label>

      <label className="field-range" htmlFor="wind-speed">
        <span>
          <strong>風速</strong>
          <output>{windSpeed} kt</output>
        </span>
        <input
          id="wind-speed"
          type="range"
          min="4"
          max="18"
          step="1"
          value={windSpeed}
          onInput={(event) => onWindChange(Number(event.currentTarget.value))}
        />
        <small><span>LIGHT</span><span>FRESH</span></small>
      </label>

      <p className="course-rule">
        <span aria-hidden="true">✓</span>
        基本角度・艇バランス・センターは自動で最適。
      </p>
    </section>
  )
}
