import {
  buildRigSurfaces,
  DRAFT_PEAK_COLUMN,
  getLevelRow,
  measureSurfaceRow,
  projectSurface,
} from '../domain/sailGeometry'
import type {
  ProjectedPoint,
  ProjectedSurface,
  ProjectionView,
  RigSurfaces,
  SurfaceRow,
} from '../domain/sailGeometry'
import type {
  BoatClass,
  ControlKey,
  SailLevel,
  TrimResult,
} from '../domain/types'

type BoatViewProps = {
  boat: BoatClass
  angle: number
  windSpeed: number
  result: TrimResult
  courseNotice: string
  focusControl?: ControlKey
  showTarget: boolean
  onToggleTarget: () => void
}

type Focus = { sail: 'main' | 'jib'; level: SailLevel }

const CONTROL_FOCUS: Partial<Record<ControlKey, Focus>> = {
  vang: { sail: 'main', level: 'upper' },
  cunningham: { sail: 'main', level: 'middle' },
  outhaul: { sail: 'main', level: 'lower' },
  chock: { sail: 'main', level: 'lower' },
  forePuller: { sail: 'main', level: 'middle' },
  aftPuller: { sail: 'main', level: 'middle' },
  jibHeight: { sail: 'jib', level: 'upper' },
  jibLeadForeAft: { sail: 'jib', level: 'upper' },
}

const VIEW_META: Record<
  ProjectionView,
  { index: string; view: string; title: string; note: string }
> = {
  top: {
    index: '01',
    view: 'PLAN / 上から',
    title: '開きとドラフト',
    note: '高さごとの曲線を重ねて見る',
  },
  side: {
    index: '02',
    view: 'SIDE / 斜め横',
    title: 'ラフからリーチ',
    note: '横18°・上12°から深さを残す',
  },
  aft: {
    index: '03',
    view: 'AFT / 後ろから',
    title: '高さごとのツイスト',
    note: '上・中・下の開き角を比べる',
  },
}

const LEVEL_LABELS: Record<SailLevel, string> = {
  upper: '上部 75%',
  middle: '中部 50%',
  lower: '下部 25%',
}

type Mapper = (point: { x: number; y: number }) => { x: number; y: number }

function createMapper(
  surfaces: ProjectedSurface[],
  width: number,
  height: number,
  view: ProjectionView,
): Mapper {
  const points = surfaces.flatMap((surface) =>
    surface.rows.flatMap((row) => row.points),
  )
  const extra = view === 'top'
    ? [{ x: -1.08, y: -0.22 }, { x: 1.22, y: 0.22 }]
    : view === 'side'
      ? [{ x: -1.08, y: -0.14 }, { x: 1.22, y: 1.28 }]
      : [{ x: -0.32, y: -0.14 }, { x: 1.05, y: 1.28 }]
  const all = [...points, ...extra]
  const minX = Math.min(...all.map((point) => point.x))
  const maxX = Math.max(...all.map((point) => point.x))
  const minY = Math.min(...all.map((point) => point.y))
  const maxY = Math.max(...all.map((point) => point.y))
  const padding = 18
  const scale = Math.min(
    (width - padding * 2) / Math.max(0.01, maxX - minX),
    (height - padding * 2) / Math.max(0.01, maxY - minY),
  )
  const usedWidth = (maxX - minX) * scale
  const usedHeight = (maxY - minY) * scale
  const offsetX = (width - usedWidth) / 2
  const offsetY = (height - usedHeight) / 2

  return (point) => ({
    x: offsetX + (point.x - minX) * scale,
    y: height - offsetY - (point.y - minY) * scale,
  })
}

function path(points: ProjectedPoint[], map: Mapper, close = false) {
  const mapped = points.map(map)
  if (mapped.length === 0) return ''
  return `M${mapped.map((point) => `${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join('L')}${close ? 'Z' : ''}`
}

function outlinePoints(surface: ProjectedSurface) {
  const rows = surface.rows
  const lower = rows[0].points
  const leech = rows.slice(1).map((row) => row.points.at(-1) as ProjectedPoint)
  const top = [...rows.at(-1)!.points].reverse().slice(1)
  const luff = [...rows].reverse().slice(1, -1).map((row) => row.points[0])
  return [...lower, ...leech, ...top, ...luff]
}

function projectedRigGuides(view: ProjectionView, map: Mapper) {
  const line = (points: Array<{ x: number; y: number }>) => {
    const mapped = points.map(map)
    return `M${mapped.map((point) => `${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join('L')}`
  }

  if (view === 'top') {
    return {
      hull: line([
        { x: -1.05, y: 0 }, { x: -0.82, y: -0.12 },
        { x: 0.98, y: -0.11 }, { x: 1.18, y: 0 },
        { x: 0.98, y: 0.11 }, { x: -0.82, y: 0.12 }, { x: -1.05, y: 0 },
      ]),
      mast: line([{ x: 0, y: -0.15 }, { x: 0, y: 0.15 }]),
      water: '',
    }
  }
  if (view === 'side') {
    return {
      hull: line([
        { x: -1.02, y: -0.02 }, { x: -0.65, y: -0.12 },
        { x: 0.96, y: -0.11 }, { x: 1.18, y: -0.02 }, { x: -1.02, y: -0.02 },
      ]),
      mast: line([{ x: 0, y: -0.02 }, { x: -0.018, y: 1.22 }]),
      water: line([{ x: -1.08, y: -0.14 }, { x: 1.22, y: -0.14 }]),
    }
  }
  return {
    hull: line([
      { x: -0.3, y: -0.02 }, { x: -0.2, y: -0.13 },
      { x: 0.2, y: -0.13 }, { x: 0.3, y: -0.02 }, { x: -0.3, y: -0.02 },
    ]),
    mast: line([{ x: 0, y: -0.02 }, { x: 0, y: 1.22 }]),
    water: line([{ x: -0.32, y: -0.14 }, { x: 1.05, y: -0.14 }]),
  }
}

function SurfaceLayer({
  surface,
  map,
  active,
  target,
}: {
  surface: ProjectedSurface
  map: Mapper
  active: Focus
  target: boolean
}) {
  const spanColumns = [0, 5, DRAFT_PEAK_COLUMN, 15, 20, 24]
  const prefix = target ? 'geometry-target' : 'geometry-current'

  return (
    <g className={`${prefix} geometry-${surface.sail}`}>
      <path className="geometry-sail-fill" d={path(outlinePoints(surface), map, true)} />
      <path className="geometry-sail-outline" d={path(outlinePoints(surface), map, true)} />
      {!target ? spanColumns.map((column) => (
        <path
          key={column}
          className="geometry-span-line"
          d={path(surface.rows.map((row) => row.points[column]), map)}
        />
      )) : null}
      {!target ? surface.rows.map((row) => (
        <path
          key={row.height}
          className={row.level ? 'geometry-chord-line is-draft-row' : 'geometry-chord-line'}
          d={path(row.points, map)}
        />
      )) : null}
      {surface.rows.filter((row) => row.level).map((row) => {
        const selected = row.level === active.level && surface.sail === active.sail
        const peak = map(row.points[DRAFT_PEAK_COLUMN])
        return (
          <g key={`draft-${row.level}`} className={selected ? 'geometry-draft-row is-selected' : 'geometry-draft-row'}>
            <path d={path(row.points, map)} />
            {!target ? <circle cx={peak.x} cy={peak.y} r={selected ? 4.2 : 2.7} /> : null}
          </g>
        )
      })}
    </g>
  )
}

function ProjectionPanel({
  view,
  actual,
  target,
  active,
  showTarget,
}: {
  view: ProjectionView
  actual: RigSurfaces
  target: RigSurfaces
  active: Focus
  showTarget: boolean
}) {
  const width = 400
  const height = 245
  const actualProjected = [
    projectSurface(actual.jib, view),
    projectSurface(actual.main, view),
  ]
  const targetProjected = [
    projectSurface(target.jib, view),
    projectSurface(target.main, view),
  ]
  const map = createMapper(
    [...actualProjected, ...targetProjected],
    width,
    height,
    view,
  )
  const guides = projectedRigGuides(view, map)
  const meta = VIEW_META[view]

  return (
    <figure className={`geometry-panel geometry-panel-${view}`}>
      <figcaption>
        <span>{meta.index}</span>
        <div><strong>{meta.view}</strong><small>{meta.title}</small></div>
      </figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${meta.view}。単一の3Dセール面を投影し、${meta.note}。`}
      >
        {guides.water ? <path className="geometry-waterline" d={guides.water} /> : null}
        <path className="geometry-hull" d={guides.hull} />
        <path className="geometry-mast" d={guides.mast} />
        {showTarget ? targetProjected.map((surface) => (
          <SurfaceLayer key={`target-${surface.sail}`} surface={surface} map={map} active={active} target />
        )) : null}
        {actualProjected.map((surface) => (
          <SurfaceLayer key={surface.sail} surface={surface} map={map} active={active} target={false} />
        ))}
        <text x="14" y="232" className="geometry-camera-note">{meta.note}</text>
      </svg>
    </figure>
  )
}

function profilePath(row: SurfaceRow) {
  const luff = row.points[0]
  const leech = row.points.at(-1)!
  const chordX = leech.x - luff.x
  const chordY = leech.y - luff.y
  const chord = Math.hypot(chordX, chordY)
  const unitX = chordX / chord
  const unitY = chordY / chord
  const normalX = -unitY
  const normalY = unitX
  const points = row.points.map((point) => {
    const offsetX = point.x - luff.x
    const offsetY = point.y - luff.y
    const u = (offsetX * unitX + offsetY * unitY) / chord
    const depth = (offsetX * normalX + offsetY * normalY) / chord
    return { x: 18 + u * 284, y: 70 - depth * 310 }
  })
  return `M${points.map((point) => `${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join('L')}`
}

function SectionInspector({
  active,
  actual,
  target,
  showTarget,
}: {
  active: Focus
  actual: RigSurfaces
  target: RigSurfaces
  showTarget: boolean
}) {
  const currentRow = getLevelRow(actual[active.sail], active.level)
  const targetRow = getLevelRow(target[active.sail], active.level)
  const current = measureSurfaceRow(currentRow, 0)
  const reference = measureSurfaceRow(targetRow, 0)
  const currentPeak = currentRow.points[DRAFT_PEAK_COLUMN]
  const targetPeak = targetRow.points[DRAFT_PEAK_COLUMN]
  const currentPeakX = 18 + currentPeak.u * 284
  const targetPeakX = 18 + targetPeak.u * 284
  const currentPeakY = 70 - current.draftDepth * 310
  const targetPeakY = 70 - reference.draftDepth * 310
  const sailLabel = active.sail === 'main' ? 'メイン' : 'ジブ'

  return (
    <div className="geometry-inspector" aria-live="polite">
      <div className="geometry-profile-title">
        <span>SELECTED STRIPE</span>
        <strong>{sailLabel}・{LEVEL_LABELS[active.level]}</strong>
        <small>三面図の太線と同じ断面</small>
      </div>
      <svg viewBox="0 0 320 92" role="img" aria-label={`${sailLabel}${LEVEL_LABELS[active.level]}の水平断面`}>
        <path className="geometry-profile-chord" d="M18 70H302" />
        {showTarget ? <path className="geometry-profile-target" d={profilePath(targetRow)} /> : null}
        <path className="geometry-profile-current" d={profilePath(currentRow)} />
        {showTarget ? <circle className="geometry-profile-target-point" cx={targetPeakX} cy={targetPeakY} r="3.2" /> : null}
        <circle className="geometry-profile-current-point" cx={currentPeakX} cy={currentPeakY} r="3.7" />
        <text x="18" y="86">LUFF 0%</text><text x="302" y="86" textAnchor="end">LEECH 100%</text>
      </svg>
      <div className="geometry-readings">
        <div><span>深さ</span><strong>{(current.draftDepth * 100).toFixed(1)}%</strong><small>基準 {(reference.draftDepth * 100).toFixed(1)}%</small></div>
        <div><span>最大位置</span><strong>{Math.round(current.draftPosition * 100)}%</strong><small>基準 {Math.round(reference.draftPosition * 100)}%</small></div>
        <div><span>ツイスト</span><strong>{currentRow.section.twist.toFixed(1)}°</strong><small>基準 {targetRow.section.twist.toFixed(1)}°</small></div>
      </div>
    </div>
  )
}

export function BoatView({
  boat,
  angle,
  windSpeed,
  result,
  courseNotice,
  focusControl,
  showTarget,
  onToggleTarget,
}: BoatViewProps) {
  const active = CONTROL_FOCUS[focusControl ?? 'cunningham'] ?? {
    sail: 'main',
    level: 'middle',
  }
  const actualSurfaces = buildRigSurfaces(boat, result.actual)
  const targetSurfaces = buildRigSurfaces(boat, result.target)

  return (
    <section className="boat-view geometry-view" aria-labelledby="boat-view-title">
      <div className="boat-view-head geometry-view-head">
        <div className="section-heading light-heading">
          <span className="section-index">B</span>
          <div>
            <p>ONE SURFACE / THREE CAMERAS</p>
            <h2 id="boat-view-title">同じセール面を三方向から測る</h2>
          </div>
        </div>
        <div className="geometry-head-tools">
          <span className="geometry-condition">{boat} · TWA {angle}° · {windSpeed} kt</span>
          <div className="geometry-legend" aria-label="形状の凡例">
            <span><i className="legend-main" />メイン</span>
            <span><i className="legend-jib" />ジブ</span>
          </div>
          <button type="button" className={showTarget ? 'geometry-target-toggle is-active' : 'geometry-target-toggle'} aria-pressed={showTarget} onClick={onToggleTarget}>
            <i />基準形
          </button>
        </div>
      </div>

      <div className="geometry-stage">
        {(['top', 'side', 'aft'] as const).map((view) => (
          <ProjectionPanel
            key={view}
            view={view}
            actual={actualSurfaces}
            target={targetSurfaces}
            active={active}
            showTarget={showTarget}
          />
        ))}
      </div>

      <SectionInspector
        active={active}
        actual={actualSurfaces}
        target={targetSurfaces}
        showTarget={showTarget}
      />

      <div className="course-notice geometry-course-notice">
        <span>LIVE CAUSE → SHAPE</span>
        <p>{courseNotice}</p>
      </div>
    </section>
  )
}
