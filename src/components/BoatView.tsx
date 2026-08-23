import type { CSSProperties } from 'react'
import {
  buildBoomGeometry,
  buildMastGeometry,
  buildRigHardpoints,
  buildRigSurfaces,
  CLASS_SAIL_SPECIFICATIONS,
  DRAFT_PEAK_COLUMN,
  fitProjection,
  getLevelRow,
  measureSurfaceRow,
  projectCoordinate,
  projectSurface,
  SAIL_GEOMETRY_UNIT_MM,
  surfaceRowProfile,
} from '../domain/sailGeometry'
import {
  buildHullGeometry,
  HULL_SPECIFICATIONS,
  projectHullPoint,
  type HullPoint,
} from '../domain/hullGeometry'
import {
  compareShapeChange,
  focusForControl,
} from '../domain/shapeComparison'
import type { ControlMove } from '../domain/shapeComparison'
import { CONTROL_LABELS } from '../domain/trimModel'
import type {
  ProjectedPoint,
  ProjectedSurface,
  ProjectionView,
  RigSurfaces,
  SurfaceRow,
  BoomGeometry,
  MastGeometry,
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
  previousResult: TrimResult
  courseNotice: string
  focusControl?: ControlKey
  comparisonMode: ComparisonMode
  hasPrevious: boolean
  lastMove?: ControlMove
  shareStatus: string
  onComparisonModeChange: (mode: ComparisonMode) => void
  onShareShape: () => void
}

export type ComparisonMode = 'previous' | 'target'

type Focus = { sail: 'main' | 'jib'; level: SailLevel }

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
    view: 'BOOM END / ブーム後端',
    title: 'ドラフトとツイスト',
    note: 'ブーム後端から前を見る。深さ方向×3でふくらみと上部の開きを比べる',
  },
}

const LEVEL_LABELS: Record<SailLevel, string> = {
  upper: '上部 75%',
  middle: '中部 50%',
  lower: '下部 25%',
}

type Mapper = (point: { x: number; y: number }) => { x: number; y: number }

const BOOM_END_DEPTH_DISPLAY_SCALE = 3

function createMapper(
  surfaces: ProjectedSurface[],
  width: number,
  height: number,
  view: ProjectionView,
  boat: BoatClass,
  framePoints: Array<{ x: number; y: number }> = [],
): Mapper {
  const points = surfaces.flatMap((surface) =>
    surface.rows.flatMap((row) => row.points),
  )
  const classScale = boat === '470' ? 1.12 : 1
  const rigHeight = CLASS_SAIL_SPECIFICATIONS[boat].main.luffMm / SAIL_GEOMETRY_UNIT_MM
  const extra = view === 'top'
    ? [{ x: -1.12 * classScale, y: -0.24 }, { x: 1.28 * classScale, y: 0.24 }]
    : view === 'side'
      ? [{ x: -1.12 * classScale, y: -0.16 }, { x: 1.28 * classScale, y: rigHeight + 0.1 }]
      : [{ x: -0.58, y: -0.16 }, { x: 0.66, y: rigHeight + 0.1 }]
  const depthScale = view === 'aft' ? BOOM_END_DEPTH_DISPLAY_SCALE : 1
  const all = [...points, ...framePoints, ...extra].map((point) => ({
    x: point.x * depthScale,
    y: point.y,
  }))
  const minX = Math.min(...all.map((point) => point.x))
  if (!Number.isFinite(minX)) return () => ({ x: width / 2, y: height / 2 })
  const fitted = fitProjection(all, width, height, view)
  return (point) => fitted({ x: point.x * depthScale, y: point.y })
}

function path(points: Array<{ x: number; y: number }>, map: Mapper, close = false) {
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

function projectHullLine(
  points: HullPoint[],
  view: ProjectionView,
  aftAzimuthDegrees?: number,
) {
  return points.map((point) => {
    const projected = projectHullPoint(point, view, aftAzimuthDegrees)
    return { x: projected.screenX, y: projected.screenY }
  })
}

function HullLayer({
  boat,
  view,
  map,
  aftAzimuthDegrees,
}: {
  boat: BoatClass
  view: ProjectionView
  map: Mapper
  aftAzimuthDegrees?: number
}) {
  const hull = buildHullGeometry(boat)
  const project = (points: HullPoint[]) => projectHullLine(points, view, aftAzimuthDegrees)
  const panels = hull.panels.map(project)
  const stationLines = hull.stationLines.map(project)
  const deckOutline = project(hull.deckOutline)
  const cockpitOutline = project(hull.cockpitOutline)
  const centerline = project(hull.centerline)
  const mastBase = project([hull.mastBase])[0]
  const jibTack = project([hull.jibTack])[0]

  return (
    <g className={`geometry-hull-model is-${view}`}>
      {panels.map((panel, index) => (
        <path key={`panel-${index}`} className="geometry-hull-panel" d={path(panel, map, true)} />
      ))}
      <path className="geometry-hull-deck" d={path(deckOutline, map, true)} />
      {stationLines.map((line, index) => (
        <path key={`station-${index}`} className="geometry-hull-station" d={path(line, map)} />
      ))}
      <path className="geometry-hull-centerline" d={path(centerline, map)} />
      <path className="geometry-cockpit" d={path(cockpitOutline, map, true)} />
      <circle className="geometry-hardpoint" cx={map(mastBase).x} cy={map(mastBase).y} r="2.8" />
      <circle className="geometry-hardpoint is-jib" cx={map(jibTack).x} cy={map(jibTack).y} r="2.4" />
    </g>
  )
}

function BoomLayer({
  boom,
  view,
  map,
  aftAzimuthDegrees,
}: {
  boom: BoomGeometry
  view: ProjectionView
  map: Mapper
  aftAzimuthDegrees?: number
}) {
  const project = (points: Array<{ x: number; y: number; z: number }>) =>
    points.map((point) => projectCoordinate(point, view, aftAzimuthDegrees))
  const endCenter = map(projectCoordinate(boom.aftEnd.center, view, aftAzimuthDegrees))
  const endOuter = project(boom.aftEnd.outer)
  const endInner = project(boom.aftEnd.inner)
  const annotationRight = endCenter.x < 210
  const detailCenter = {
    x: Math.min(385, Math.max(35, endCenter.x + (annotationRight ? 43 : -43))),
    y: Math.min(300, Math.max(30, endCenter.y - 32)),
  }
  const detailScale = view === 'aft' ? 2 : 6
  const enlarge = (points: Array<{ x: number; y: number }>) => points
    .map(map)
    .map((point) => ({
      x: detailCenter.x + (point.x - endCenter.x) * detailScale,
      y: detailCenter.y + (point.y - endCenter.y) * detailScale,
    }))

  return (
    <g className={`geometry-boom is-${view}`}>
      <title>ブームと後端開口</title>
      {boom.faces.map((face, index) => (
        <path key={`boom-face-${index}`} className="geometry-boom-face" d={path(project(face), map, true)} />
      ))}
      <path className="geometry-boom-centreline" d={path(project(boom.centreline), map)} />
      <path className="geometry-boom-outer-point" d={path(project(boom.outerPointSection), map, true)} />
      <path className="geometry-boom-end" d={path(endOuter, map, true)} />
      <path className="geometry-boom-opening" d={path(endInner, map, true)} />
      {view === 'aft' ? (
        <g className="geometry-boom-annotation" aria-hidden="true">
          <circle cx={endCenter.x} cy={endCenter.y} r="8" />
          <path d={`M${endCenter.x.toFixed(2)} ${endCenter.y.toFixed(2)}L${detailCenter.x.toFixed(2)} ${detailCenter.y.toFixed(2)}`} />
          <path className="geometry-boom-end-detail" d={path(enlarge(endOuter), (point) => point, true)} />
          <path className="geometry-boom-opening-detail" d={path(enlarge(endInner), (point) => point, true)} />
          <text
            x={detailCenter.x}
            y={detailCenter.y - 14}
            textAnchor="middle"
          >END SECTION</text>
          <text
            x={detailCenter.x}
            y={detailCenter.y + 18}
            textAnchor="middle"
          >ブーム後端</text>
        </g>
      ) : null}
    </g>
  )
}

function MastLayer({
  mast,
  view,
  map,
  aftAzimuthDegrees,
  reference,
  referenceMode,
}: {
  mast: MastGeometry
  view: ProjectionView
  map: Mapper
  aftAzimuthDegrees?: number
  reference: boolean
  referenceMode?: ComparisonMode
}) {
  const project = (points: Array<{ x: number; y: number; z: number }>) =>
    points.map((point) => projectCoordinate(point, view, aftAzimuthDegrees))
  const stateClass = reference
    ? `is-reference is-${referenceMode ?? 'target'}`
    : 'is-actual'
  const sectionPointCount = mast.sections[0]?.length ?? 12
  const pointsPerShade = Math.ceil(sectionPointCount / 4)
  const shadedFaces = Array.from({ length: 4 }, (_, shade) =>
    mast.faces
      .filter((_, index) =>
        Math.floor((index % sectionPointCount) / pointsPerShade) === shade)
      .map((face) => path(project(face), map, true))
      .join(''),
  )

  return (
    <g className={`geometry-mast-model ${stateClass} is-${view}`}>
      <title>{reference ? '比較基準の立体マスト' : 'クラス寸法の立体マスト'}</title>
      {shadedFaces.map((facePath, shade) => (
        <path
          key={`mast-shade-${shade}`}
          className={`geometry-mast-face shade-${shade}`}
          d={facePath}
        />
      ))}
      <path className="geometry-mast-cap is-bottom" d={path(project(mast.bottom), map, true)} />
      <path className="geometry-mast-cap is-top" d={path(project(mast.top), map, true)} />
      {!reference ? (
        <path
          className="geometry-mast-groove"
          d={path(project(mast.sections.map((section) => section[0])), map)}
        />
      ) : null}
    </g>
  )
}

function SurfaceLayer({
  surface,
  map,
  active,
  target,
  referenceMode,
  view,
}: {
  surface: ProjectedSurface
  map: Mapper
  active: Focus
  target: boolean
  referenceMode?: ComparisonMode
  view: ProjectionView
}) {
  const spanColumns = [0, 5, DRAFT_PEAK_COLUMN, 15, 20, 24]
  const prefix = target
    ? `geometry-target is-${referenceMode ?? 'target'}`
    : 'geometry-current'
  const activeRow = surface.rows.find((row) => row.level === active.level)
  const peakPoints = surface.rows.map((row) => row.points[DRAFT_PEAK_COLUMN])

  const faces = target ? [] : surface.rows.slice(0, -1).flatMap((row, rowIndex) => {
    const nextRow = surface.rows[rowIndex + 1]
    return row.points.slice(0, -1).map((point, column) => {
      const nextPoint = row.points[column + 1]
      const upperNext = nextRow.points[column + 1]
      const upperPoint = nextRow.points[column]
      const midpoint = (point.u + nextPoint.u) / 2
      const crown = Math.sin(midpoint * Math.PI)
      const heightBias = 0.76 + row.height * 0.24
      const viewBias = view === 'top' ? 0.78 : view === 'aft' ? 1.08 : 1
      const opacity = Math.min(
        0.42,
        (0.09 + crown * (0.12 + row.section.draftDepth * 1.65)) * heightBias * viewBias,
      )
      return (
        <path
          key={`face-${rowIndex}-${column}`}
          className="geometry-sail-face"
          d={path([point, nextPoint, upperNext, upperPoint], map, true)}
          style={{ '--face-opacity': opacity } as CSSProperties}
        />
      )
    })
  })

  return (
    <g className={`${prefix} geometry-${surface.sail}`}>
      <path className="geometry-sail-fill" d={path(outlinePoints(surface), map, true)} />
      {faces}
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
      {!target ? surface.rows.filter((row) => row.battenStartU !== undefined).map((row) => (
        <path
          key={`batten-${row.height}`}
          className="geometry-batten"
          d={path(row.points.filter((point) => point.u >= row.battenStartU!), map)}
        />
      )) : null}
      {!target ? (
        <path className="geometry-draft-spine" d={path(peakPoints, map)} />
      ) : null}
      {surface.rows.filter((row) => row.level).map((row) => {
        const selected = row.level === active.level && surface.sail === active.sail
        const peak = map(row.points[DRAFT_PEAK_COLUMN])
        return (
          <g key={`draft-${row.level}`} className={selected ? 'geometry-draft-row is-selected' : 'geometry-draft-row'}>
            {selected && !target ? <path className="geometry-section-band" d={path(row.points, map)} /> : null}
            <path d={path(row.points, map)} />
            {!target ? <circle cx={peak.x} cy={peak.y} r={selected ? 4.2 : 2.7} /> : null}
          </g>
        )
      })}
      {!target && activeRow && surface.sail === active.sail ? (() => {
        const peak = map(activeRow.points[DRAFT_PEAK_COLUMN])
        return <text className="geometry-peak-label" x={peak.x + 7} y={peak.y - 7}>最大ドラフト</text>
      })() : null}
    </g>
  )
}

function ProjectionPanel({
  view,
  actual,
  reference,
  active,
  referenceMode,
  boat,
  mastBend,
  referenceMastBend,
}: {
  view: ProjectionView
  actual: RigSurfaces
  reference: RigSurfaces
  active: Focus
  referenceMode: ComparisonMode
  boat: BoatClass
  mastBend: number
  referenceMastBend: number
}) {
  const dimensions: Record<ProjectionView, { width: number; height: number }> = {
    top: { width: 760, height: 160 },
    side: { width: 500, height: 330 },
    aft: { width: 420, height: 330 },
  }
  const { width, height } = dimensions[view]
  const boom = buildBoomGeometry(boat, actual.main)
  const actualMastGeometry = buildMastGeometry(boat, mastBend)
  const referenceMastGeometry = buildMastGeometry(boat, referenceMastBend)
  const [boomStart, boomEnd] = boom.centreline
  const boomAzimuthDegrees = view === 'aft'
    ? Math.atan2(boomEnd.y - boomStart.y, boomEnd.x - boomStart.x) * 180 / Math.PI
    : undefined
  const project = (point: { x: number; y: number; z: number }) =>
    projectCoordinate(point, view, boomAzimuthDegrees)
  const actualProjected = [
    projectSurface(actual.jib, view, boomAzimuthDegrees),
    projectSurface(actual.main, view, boomAzimuthDegrees),
  ]
  const referenceProjected = [
    projectSurface(reference.jib, view, boomAzimuthDegrees),
    projectSurface(reference.main, view, boomAzimuthDegrees),
  ]
  const projectedBoomPoints = [
    ...boom.faces.flat(),
    ...boom.outerPointSection,
    ...boom.aftEnd.outer,
    ...boom.aftEnd.inner,
    ...boom.centreline,
  ].map(project)
  const projectedMastPoints = [
    ...actualMastGeometry.sections.flat(),
    ...referenceMastGeometry.sections.flat(),
  ].map(project)
  const hull = buildHullGeometry(boat)
  const rigHardpoints = buildRigHardpoints(boat, mastBend)
  const projectedHullPoints = [
    ...hull.deckOutline,
    ...hull.cockpitOutline,
    ...hull.sections.flat(),
  ].map((point) => {
    const projected = projectHullPoint(point, view, boomAzimuthDegrees)
    return { x: projected.screenX, y: projected.screenY }
  })
  const hullBottom = Math.min(...hull.sections.flat().map((point) => point.z))
  const map = createMapper(
    [...actualProjected, ...referenceProjected],
    width,
    height,
    view,
    boat,
    view === 'aft'
      ? [...projectedBoomPoints, ...projectedMastPoints]
      : [...projectedHullPoints, ...projectedBoomPoints, ...projectedMastPoints],
  )
  const meta = VIEW_META[view]
  const classSails = CLASS_SAIL_SPECIFICATIONS[boat]
  const actualJibLuff = actualProjected
    .find((surface) => surface.sail === 'jib')!
    .rows.map((row) => row.points[0])
  const projectedStemhead = project(hull.jibTack)
  const projectedJibHalyardHoist = project(rigHardpoints.jibHalyardHoist)
  const projectedMastAxis = actualMastGeometry.centreline.map(project)
  const jibTackStrop = [projectedStemhead, actualJibLuff[0]]
  const jibLuffAndHalyard = [
    projectedStemhead,
    ...actualJibLuff.slice(1),
    projectedJibHalyardHoist,
  ]
  const aftCentreline = view === 'aft'
    ? [
        project({ x: 0, y: 0, z: hullBottom }),
        { x: 0, y: Math.max(...projectedMastAxis.map((point) => point.y)) },
      ]
    : []
  const specification = HULL_SPECIFICATIONS[boat]
  const water = view === 'top' ? [] : projectHullLine([
    {
      id: `${boat}:water-a`,
      x: (specification.mastFromAftMm - specification.lengthMm - 120) / SAIL_GEOMETRY_UNIT_MM,
      y: 0,
      z: -0.24,
    },
    {
      id: `${boat}:water-b`,
      x: (specification.mastFromAftMm + 120) / SAIL_GEOMETRY_UNIT_MM,
      y: 0,
      z: -0.24,
    },
  ], view, boomAzimuthDegrees)

  return (
    <figure className={`geometry-panel geometry-panel-${view}`}>
      <figcaption>
        <span>{meta.index}</span>
        <div>
          <strong>{meta.view}</strong>
          <small>{meta.title}{view === 'aft' ? ` · ${boat} M${classSails.main.battens.length} / J${classSails.jib.battens.length}バテン` : ''}</small>
        </div>
      </figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${meta.view}。単一の3Dセール面を投影し、${meta.note}。`}
      >
        {water.length ? <path className="geometry-waterline" d={path(water, map)} /> : null}
        {aftCentreline.length ? (
          <path className="geometry-camera-centreline" d={path(aftCentreline, map)} />
        ) : null}
        <HullLayer
          boat={boat}
          view={view}
          map={map}
          aftAzimuthDegrees={boomAzimuthDegrees}
        />
        <path className="geometry-jib-tack-strop" d={path(jibTackStrop, map)} />
        <path className="geometry-forestay" d={path(jibLuffAndHalyard, map)} />
        <MastLayer
          mast={referenceMastGeometry}
          view={view}
          map={map}
          aftAzimuthDegrees={boomAzimuthDegrees}
          reference
          referenceMode={referenceMode}
        />
        {referenceProjected.map((surface) => (
          <SurfaceLayer
            key={`reference-${surface.sail}`}
            surface={surface}
            map={map}
            active={active}
            target
            referenceMode={referenceMode}
            view={view}
          />
        ))}
        {actualProjected.map((surface) => (
          <SurfaceLayer key={surface.sail} surface={surface} map={map} active={active} target={false} view={view} />
        ))}
        <MastLayer
          mast={actualMastGeometry}
          view={view}
          map={map}
          aftAzimuthDegrees={boomAzimuthDegrees}
          reference={false}
        />
        <BoomLayer
          boom={boom}
          view={view}
          map={map}
          aftAzimuthDegrees={boomAzimuthDegrees}
        />
        <text x="14" y={height - 10} className="geometry-camera-note">{meta.note}</text>
      </svg>
    </figure>
  )
}

function profilePath(row: SurfaceRow) {
  const points = surfaceRowProfile(row).map((point) => ({
    x: 18 + point.u * 284,
    y: 70 - point.depth * 310,
  }))
  return `M${points.map((point) => `${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join('L')}`
}

function SectionInspector({
  active,
  actual,
  reference,
  referenceMode,
}: {
  active: Focus
  actual: RigSurfaces
  reference: RigSurfaces
  referenceMode: ComparisonMode
}) {
  const currentRow = getLevelRow(actual[active.sail], active.level)
  const referenceRow = getLevelRow(reference[active.sail], active.level)
  const current = measureSurfaceRow(currentRow, 0)
  const compared = measureSurfaceRow(referenceRow, 0)
  const currentPeak = currentRow.points[DRAFT_PEAK_COLUMN]
  const referencePeak = referenceRow.points[DRAFT_PEAK_COLUMN]
  const currentPeakX = 18 + currentPeak.u * 284
  const referencePeakX = 18 + referencePeak.u * 284
  const currentPeakY = 70 - current.draftDepth * 310
  const referencePeakY = 70 - compared.draftDepth * 310
  const sailLabel = active.sail === 'main' ? 'メイン' : 'ジブ'
  const referenceLabel = referenceMode === 'previous' ? '操作前' : '基準'

  return (
    <div className="geometry-inspector" aria-live="polite">
      <div className="geometry-profile-title">
        <span>SELECTED STRIPE</span>
        <strong>{sailLabel}・{LEVEL_LABELS[active.level]}</strong>
        <small>三面図の太線と同じ断面</small>
      </div>
      <svg viewBox="0 0 320 92" role="img" aria-label={`${sailLabel}${LEVEL_LABELS[active.level]}の水平断面`}>
        <path className="geometry-profile-chord" d="M18 70H302" />
        <path className={`geometry-profile-target is-${referenceMode}`} d={profilePath(referenceRow)} />
        <path className="geometry-profile-current" d={profilePath(currentRow)} />
        <circle className={`geometry-profile-target-point is-${referenceMode}`} cx={referencePeakX} cy={referencePeakY} r="3.2" />
        <circle className="geometry-profile-current-point" cx={currentPeakX} cy={currentPeakY} r="3.7" />
        <text x="18" y="86">LUFF 0%</text><text x="302" y="86" textAnchor="end">LEECH 100%</text>
      </svg>
      <div className="geometry-readings">
        <div><span>深さ</span><strong>{(current.draftDepth * 100).toFixed(1)}%</strong><small>{referenceLabel} {(compared.draftDepth * 100).toFixed(1)}%</small></div>
        <div><span>最大位置</span><strong>{Math.round(current.draftPosition * 100)}%</strong><small>{referenceLabel} {Math.round(compared.draftPosition * 100)}%</small></div>
        <div><span>ツイスト</span><strong>{currentRow.section.twist.toFixed(1)}°</strong><small>{referenceLabel} {referenceRow.section.twist.toFixed(1)}°</small></div>
        <div><span>入口 / 出口角</span><strong>{current.entryAngle.toFixed(0)}° / {current.exitAngle.toFixed(0)}°</strong><small>{referenceLabel} {compared.entryAngle.toFixed(0)}° / {compared.exitAngle.toFixed(0)}°</small></div>
      </div>
    </div>
  )
}

function deltaReading(
  value: number,
  unit: string,
  positive: string,
  negative: string,
  threshold: number,
) {
  if (Math.abs(value) < threshold) return { value: '≈ 0', direction: 'ほぼ不変' }
  return {
    value: `${value > 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}${unit}`,
    direction: value > 0 ? positive : negative,
  }
}

function ShapeDeltaStrip({
  before,
  after,
  move,
}: {
  before: TrimResult
  after: TrimResult
  move: ControlMove
}) {
  const delta = compareShapeChange(before, after, move.control)
  const depth = deltaReading(delta.draftDepthPoints, 'pt', '深く', '浅く', 0.05)
  const position = deltaReading(delta.draftPositionPoints, 'pt', '後ろへ', '前へ', 0.05)
  const twist = deltaReading(delta.twistDegrees, '°', '開く', '閉じる', 0.05)

  return (
    <div className="shape-delta-strip" aria-live="polite">
      <div className="shape-delta-control">
        <span>LAST MOVE / 操作前との差</span>
        <strong>{CONTROL_LABELS[move.control]}</strong>
        <small>{move.from} → {move.to}</small>
      </div>
      <div><span>深さ</span><strong>{depth.value}</strong><small>{depth.direction}</small></div>
      <div><span>最大位置</span><strong>{position.value}</strong><small>{position.direction}</small></div>
      <div><span>ツイスト</span><strong>{twist.value}</strong><small>{twist.direction}</small></div>
    </div>
  )
}

export function BoatView({
  boat,
  angle,
  windSpeed,
  result,
  previousResult,
  courseNotice,
  focusControl,
  comparisonMode,
  hasPrevious,
  lastMove,
  shareStatus,
  onComparisonModeChange,
  onShareShape,
}: BoatViewProps) {
  const active = focusForControl(focusControl)
  const actualSurfaces = buildRigSurfaces(boat, result.actual)
  const referenceSurfaces = buildRigSurfaces(
    boat,
    comparisonMode === 'previous' ? previousResult.actual : result.target,
  )
  const referenceLabel = comparisonMode === 'previous' ? '操作前' : '基準形'
  const geometryReference = boat === '420'
    ? 'WS DRAWING #5J · NORTH M-12'
    : 'WS 470-003 · NORTH N17-L26'

  return (
    <section className="boat-view geometry-view" aria-labelledby="boat-view-title">
      <div className="boat-view-head geometry-view-head">
        <div className="section-heading light-heading">
          <span className="section-index">B</span>
          <div>
            <p>LOCKED LUFF / CLASS CORNERS + SAILMAKER SILHOUETTE / THREE CAMERAS</p>
            <h2 id="boat-view-title">{boat}実艇形状を、三方向で見てトリム</h2>
          </div>
        </div>
        <div className="geometry-head-tools">
          <span className="geometry-condition">
            {geometryReference} · TWA {angle}° → AWA {result.apparentWindAngle.toFixed(1)}° · {windSpeed} kt · ブーム 中心線から {result.actual.main.angle.toFixed(1)}°
          </span>
          <div className="geometry-legend" aria-label="形状の凡例">
            <span><i className="legend-main" />メイン</span>
            <span><i className="legend-jib" />ジブ</span>
            <span><i className="legend-draft" />最大ドラフト線</span>
            <span><i className={`legend-reference is-${comparisonMode}`} />{referenceLabel}</span>
          </div>
          <div className="geometry-compare-switch" aria-label="比較する形">
            <button type="button" className={comparisonMode === 'previous' ? 'is-active' : ''} disabled={!hasPrevious} aria-pressed={comparisonMode === 'previous'} onClick={() => onComparisonModeChange('previous')}>操作前</button>
            <button type="button" className={comparisonMode === 'target' ? 'is-active' : ''} aria-pressed={comparisonMode === 'target'} onClick={() => onComparisonModeChange('target')}>基準形</button>
          </div>
          <button type="button" className="geometry-share-button" onClick={onShareShape}>この形を共有 ↗</button>
        </div>
      </div>
      {shareStatus ? <p className="geometry-share-status" role="status">{shareStatus}</p> : null}

      <div className="geometry-stage">
        {(['top', 'side', 'aft'] as const).map((view) => (
          <ProjectionPanel
            key={view}
            view={view}
            actual={actualSurfaces}
            reference={referenceSurfaces}
            active={active}
            referenceMode={comparisonMode}
            boat={boat}
            mastBend={result.actual.main.mastBend}
            referenceMastBend={
              comparisonMode === 'previous'
                ? previousResult.actual.main.mastBend
                : result.target.main.mastBend
            }
          />
        ))}
      </div>

      <SectionInspector
        active={active}
        actual={actualSurfaces}
        reference={referenceSurfaces}
        referenceMode={comparisonMode}
      />

      {lastMove ? (
        <ShapeDeltaStrip before={previousResult} after={result} move={lastMove} />
      ) : (
        <div className="course-notice geometry-course-notice">
          <span>LIVE CAUSE → SHAPE</span>
          <p>{courseNotice}</p>
        </div>
      )}
    </section>
  )
}
