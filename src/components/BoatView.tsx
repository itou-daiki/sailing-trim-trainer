import { useState, type CSSProperties } from 'react'
import {
  buildBoomGeometry,
  buildMastGeometry,
  buildRigHardpoints,
  buildRigSurfaces,
  CLASS_SAIL_SPECIFICATIONS,
  createBoomEndCamera,
  fitProjection,
  getLevelRow,
  measureSurfaceRow,
  projectBoomEndCoordinate,
  projectCoordinate,
  projectSurface,
  SAIL_GEOMETRY_UNIT_MM,
  surfaceRowProfile,
} from '../domain/sailGeometry'
import {
  buildHullGeometry,
  HULL_SPECIFICATIONS,
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
  CoordinateProjector,
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
    note: '3本のドラフトストライプの曲がりを重ねて見る',
  },
  side: {
    index: '02',
    view: 'SIDE / 斜め横',
    title: 'ラフからリーチ',
    note: '選択ストライプをラフからリーチへ追う',
  },
  aft: {
    index: '03',
    view: 'BOOM END / ブーム後方',
    title: '上段バテンとツイスト',
    note: 'ブーム口の真後ろからマスト方向へ透視。口・ブーム・上段バテンの向きを比べる',
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
      : []
  const all = [...points, ...framePoints, ...extra]
  const minX = Math.min(...all.map((point) => point.x))
  if (!Number.isFinite(minX)) return () => ({ x: width / 2, y: height / 2 })
  const fitted = fitProjection(all, width, height, view, view === 'aft' ? 24 : 18)
  return fitted
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
  coordinateProjector?: CoordinateProjector,
) {
  return points.map((point) => {
    return coordinateProjector
      ? coordinateProjector(point)
      : projectCoordinate(point, view, aftAzimuthDegrees)
  })
}

function HullLayer({
  boat,
  view,
  map,
  aftAzimuthDegrees,
  coordinateProjector,
}: {
  boat: BoatClass
  view: ProjectionView
  map: Mapper
  aftAzimuthDegrees?: number
  coordinateProjector?: CoordinateProjector
}) {
  const hull = buildHullGeometry(boat)
  const project = (points: HullPoint[]) =>
    projectHullLine(points, view, aftAzimuthDegrees, coordinateProjector)
  const panels = hull.panels.map(project)
  const transomFaces = hull.transomFaces.map(project)
  const deckFaces = hull.deckFaces.map(project)
  const cockpitFloorFaces = hull.cockpitFloorFaces.map(project)
  const cockpitWallFaces = hull.cockpitWallFaces.map(project)
  const centerboardCaseFaces = hull.centerboardCaseFaces.map(project)
  const thwartFaces = hull.thwartFaces.map(project)
  const breakwaterFaces = hull.breakwaterFaces.map(project)
  const stationLines = hull.stationLines.map(project)
  const deckOutline = project(hull.deckOutline)
  const cockpitOutline = project(hull.cockpitOutline)
  const cockpitFloorOutline = project(hull.cockpitFloorOutline)
  const centerline = project(hull.centerline)
  const gunwaleLines = hull.gunwaleLines.map(project)
  const centerboardCaseOutline = project(hull.centerboardCaseOutline)
  const mainsheetTrack = project(hull.mainsheetTrack)
  const mastBase = project([hull.mastBase])[0]
  const jibTack = project([hull.jibTack])[0]

  return (
    <g className={`geometry-hull-model is-${view}`}>
      <title>{boat}級の外板、甲板、コクピット、センターボードケース</title>
      {panels.map((panel, index) => (
        <path key={`panel-${index}`} className="geometry-hull-panel" d={path(panel, map, true)} />
      ))}
      {transomFaces.map((face, index) => (
        <path key={`transom-${index}`} className="geometry-hull-transom" d={path(face, map, true)} />
      ))}
      {deckFaces.map((face, index) => (
        <path key={`deck-${index}`} className="geometry-hull-deck-face" d={path(face, map, true)} />
      ))}
      {cockpitFloorFaces.map((face, index) => (
        <path key={`cockpit-floor-${index}`} className="geometry-cockpit-floor" d={path(face, map, true)} />
      ))}
      {cockpitWallFaces.map((face, index) => (
        <path key={`cockpit-wall-${index}`} className="geometry-cockpit-wall" d={path(face, map, true)} />
      ))}
      {centerboardCaseFaces.map((face, index) => (
        <path key={`case-${index}`} className="geometry-centerboard-case" d={path(face, map, true)} />
      ))}
      {thwartFaces.map((face, index) => (
        <path key={`thwart-${index}`} className="geometry-thwart" d={path(face, map, true)} />
      ))}
      {breakwaterFaces.map((face, index) => (
        <path key={`breakwater-${index}`} className="geometry-breakwater" d={path(face, map, true)} />
      ))}
      {stationLines.map((line, index) => (
        <path key={`station-${index}`} className="geometry-hull-station" d={path(line, map)} />
      ))}
      <path className="geometry-hull-deck-outline" d={path(deckOutline, map, true)} />
      {gunwaleLines.map((line, index) => (
        <path key={`gunwale-${index}`} className="geometry-gunwale" d={path(line, map)} />
      ))}
      <path className="geometry-hull-centerline" d={path(centerline, map)} />
      <path className="geometry-cockpit-rim" d={path(cockpitOutline, map, true)} />
      <path className="geometry-cockpit-floor-outline" d={path(cockpitFloorOutline, map, true)} />
      <path className="geometry-centerboard-case-outline" d={path(centerboardCaseOutline, map, true)} />
      <path className="geometry-mainsheet-track" d={path(mainsheetTrack, map)} />
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
  coordinateProjector,
}: {
  boom: BoomGeometry
  view: ProjectionView
  map: Mapper
  aftAzimuthDegrees?: number
  coordinateProjector?: CoordinateProjector
}) {
  const projectPoint = coordinateProjector ?? ((point) =>
    projectCoordinate(point, view, aftAzimuthDegrees))
  const project = (points: Array<{ x: number; y: number; z: number }>) =>
    points.map(projectPoint)
  const endCenter = map(projectPoint(boom.aftEnd.center))
  const clew = map(projectPoint(boom.clew))
  const outerPoint = map(projectPoint(boom.outerPoint))
  const endOuter = project(boom.aftEnd.outer)
  const endInner = project(boom.aftEnd.inner)

  return (
    <g className={`geometry-boom is-${view}`}>
      <title>ブームと後端開口</title>
      {boom.faces.map((face, index) => (
        <path key={`boom-face-${index}`} className="geometry-boom-face" d={path(project(face), map, true)} />
      ))}
      {boom.limitMarkFaces.map((face, index) => (
        <path key={`boom-limit-mark-${index}`} className="geometry-boom-limit-mark" d={path(project(face), map, true)} />
      ))}
      <path className="geometry-boom-centreline" d={path(project(boom.centreline), map)} />
      <path className="geometry-boom-outer-point" d={path(project(boom.outerPointSection), map, true)} />
      <path className="geometry-boom-end" d={path(endOuter, map, true)} />
      <path className="geometry-boom-opening" d={path(endInner, map, true)} />
      {view !== 'aft' ? (
        <g className="geometry-outhaul-position">
          <title>{`クリューはブラックバンドから${boom.outhaulEaseMm.toFixed(0)} mm前`}</title>
          <path d={`M${clew.x.toFixed(2)} ${clew.y.toFixed(2)}L${outerPoint.x.toFixed(2)} ${outerPoint.y.toFixed(2)}`} />
          <circle className="is-clew" cx={clew.x} cy={clew.y} r="3.2" />
          <circle className="is-clew-hole" cx={clew.x} cy={clew.y} r="1.35" />
          <circle className="is-outer-point" cx={outerPoint.x} cy={outerPoint.y} r="1.8" />
          <text
            x={(clew.x + outerPoint.x) / 2}
            y={Math.min(clew.y, outerPoint.y) - 5}
            textAnchor="middle"
          >{`${boom.outhaulEaseMm.toFixed(0)} mm`}</text>
        </g>
      ) : null}
      {view === 'aft' ? (
        <g className="geometry-boom-mouth-label" aria-hidden="true">
          <circle cx={endCenter.x} cy={endCenter.y} r="5.5" />
          <path d={`M${(endCenter.x + 7).toFixed(2)} ${endCenter.y.toFixed(2)}h20`} />
          <text
            x={endCenter.x + 30}
            y={endCenter.y + 2.5}
          >MOUTH / 開口</text>
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
  coordinateProjector,
  reference,
  referenceMode,
}: {
  mast: MastGeometry
  view: ProjectionView
  map: Mapper
  aftAzimuthDegrees?: number
  coordinateProjector?: CoordinateProjector
  reference: boolean
  referenceMode?: ComparisonMode
}) {
  const projectPoint = coordinateProjector ?? ((point) =>
    projectCoordinate(point, view, aftAzimuthDegrees))
  const project = (points: Array<{ x: number; y: number; z: number }>) =>
    points.map(projectPoint)
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
  const spanColumns = [0, 6, 12, 18, 24]
  const prefix = target
    ? `geometry-target is-${referenceMode ?? 'target'}`
    : 'geometry-current'
  const focusClass = surface.sail === active.sail
    ? 'is-active-sail'
    : 'is-context-sail'
  const activeRow = surface.rows.find((row) => row.level === active.level)
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
    <g className={`${prefix} geometry-${surface.sail} ${focusClass}`}>
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
      {surface.rows.filter((row) => row.level).map((row) => {
        const selected = row.level === active.level && surface.sail === active.sail
        const peak = map(row.draftPeak)
        const levelLabel = row.level ? LEVEL_LABELS[row.level] : ''
        const stripePoints = [...row.points, row.draftPeak].sort((a, b) => a.u - b.u)
        return (
          <g key={`draft-${row.level}`} className={selected ? 'geometry-draft-row is-selected' : 'geometry-draft-row'}>
            <title>{`${surface.sail === 'main' ? 'メイン' : 'ジブ'} ${levelLabel}：最大位置 ${Math.round(row.draftPeak.u * 100)}%`}</title>
            {selected && !target ? <path className="geometry-section-band" d={path(stripePoints, map)} /> : null}
            <path className="geometry-draft-stripe" d={path(stripePoints, map)} />
            {!target ? (
              <g className="geometry-draft-peak">
                <circle className="geometry-draft-peak-ring" cx={peak.x} cy={peak.y} r={selected ? 4.4 : 3.2} />
                <circle className="geometry-draft-peak-core" cx={peak.x} cy={peak.y} r={selected ? 1.8 : 1.25} />
              </g>
            ) : null}
          </g>
        )
      })}
      {!target && view !== 'aft' && activeRow && surface.sail === active.sail ? (() => {
        const peak = map(activeRow.draftPeak)
        return <text className="geometry-peak-label" x={peak.x + 7} y={peak.y - 7}>{`ピーク ${Math.round(activeRow.draftPeak.u * 100)}%`}</text>
      })() : null}
    </g>
  )
}

const AFT_SECTION_LEFT = 18
const AFT_SECTION_RIGHT = 142
const AFT_SECTION_DEPTH_SCALE = 245

function AftSectionStack({
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
  const levels = ['upper', 'middle', 'lower'] as const
  const sailLabel = active.sail === 'main' ? 'MAIN' : 'JIB'
  const sectionPath = (row: SurfaceRow, baseline: number) => {
    const points = surfaceRowProfile(row).map((point) => ({
      x: AFT_SECTION_LEFT + point.u * (AFT_SECTION_RIGHT - AFT_SECTION_LEFT),
      y: baseline - point.depth * AFT_SECTION_DEPTH_SCALE,
    }))
    return path(points, (point) => point)
  }

  return (
    <g className={`geometry-aft-section-stack is-${active.sail}`} aria-hidden="true">
      <text className="geometry-aft-section-title" x={AFT_SECTION_LEFT} y="67">{`${sailLabel} · 3 SECTIONS`}</text>
      <text className="geometry-aft-section-axis" x={AFT_SECTION_LEFT} y="78">LUFF → LEECH</text>
      {levels.map((level, index) => {
        const baseline = 122 + index * 76
        const actualRow = getLevelRow(actual[active.sail], level)
        const referenceRow = getLevelRow(reference[active.sail], level)
        const selected = level === active.level
        return (
          <g key={level} className={selected ? 'is-selected' : ''}>
            <path className="geometry-aft-section-chord" d={`M${AFT_SECTION_LEFT} ${baseline}H${AFT_SECTION_RIGHT}`} />
            <path className={`geometry-aft-section-reference is-${referenceMode}`} d={sectionPath(referenceRow, baseline)} />
            <path className="geometry-aft-section-current" d={sectionPath(actualRow, baseline)} />
            <text className="geometry-aft-section-level" x={AFT_SECTION_LEFT} y={baseline + 13}>{LEVEL_LABELS[level]}</text>
            <text className="geometry-aft-section-value" x={AFT_SECTION_RIGHT} y={baseline + 13} textAnchor="end">
              {`深さ ${(actualRow.section.draftDepth * 100).toFixed(1)}% · ピーク ${Math.round(actualRow.section.draftPosition * 100)}%`}
            </text>
          </g>
        )
      })}
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
  const boomEndCamera = view === 'aft'
    ? createBoomEndCamera(boomStart, boomEnd)
    : undefined
  const project: CoordinateProjector = boomEndCamera
    ? (point) => projectBoomEndCoordinate(point, boomEndCamera)
    : (point) => projectCoordinate(point, view, boomAzimuthDegrees)
  const actualProjected = [
    projectSurface(actual.jib, view, boomAzimuthDegrees, project),
    projectSurface(actual.main, view, boomAzimuthDegrees, project),
  ]
  const referenceProjected = [
    projectSurface(reference.jib, view, boomAzimuthDegrees, project),
    projectSurface(reference.main, view, boomAzimuthDegrees, project),
  ]
  const projectedBoomPoints = [
    ...boom.faces.flat(),
    ...boom.limitMarkFaces.flat(),
    ...boom.outerPointSection,
    boom.outerPoint,
    boom.clew,
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
  const projectedHullPoints = hull.allPoints.map(project)
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
  const jibTackStrop = [projectedStemhead, actualJibLuff[0]]
  const jibLuffAndHalyard = [
    projectedStemhead,
    ...actualJibLuff.slice(1),
    projectedJibHalyardHoist,
  ]
  const aftBounds = [
    ...actualProjected.flatMap((surface) => surface.rows.flatMap((row) => row.points)),
    ...projectedBoomPoints,
    ...projectedMastPoints,
  ]
  const aftCentreline = view === 'aft'
    ? [
        { x: 0, y: Math.min(...aftBounds.map((point) => point.y)) },
        { x: 0, y: Math.max(...aftBounds.map((point) => point.y)) },
      ]
    : []
  const specification = HULL_SPECIFICATIONS[boat]
  const water = view !== 'side' ? [] : projectHullLine([
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
  ], view, boomAzimuthDegrees, project)
  const orderedReference = [...referenceProjected].sort((a, b) =>
    Number(a.sail === active.sail) - Number(b.sail === active.sail))
  const orderedActual = [...actualProjected].sort((a, b) =>
    Number(a.sail === active.sail) - Number(b.sail === active.sail))

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
        {view !== 'aft' ? (
          <HullLayer
            boat={boat}
            view={view}
            map={map}
            aftAzimuthDegrees={boomAzimuthDegrees}
            coordinateProjector={project}
          />
        ) : null}
        <path className="geometry-jib-tack-strop" d={path(jibTackStrop, map)} />
        <path className="geometry-forestay" d={path(jibLuffAndHalyard, map)} />
        <MastLayer
          mast={referenceMastGeometry}
          view={view}
          map={map}
          aftAzimuthDegrees={boomAzimuthDegrees}
          coordinateProjector={project}
          reference
          referenceMode={referenceMode}
        />
        {orderedReference.map((surface) => (
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
        {orderedActual.map((surface) => (
          <SurfaceLayer key={surface.sail} surface={surface} map={map} active={active} target={false} view={view} />
        ))}
        <MastLayer
          mast={actualMastGeometry}
          view={view}
          map={map}
          aftAzimuthDegrees={boomAzimuthDegrees}
          coordinateProjector={project}
          reference={false}
        />
        <BoomLayer
          boom={boom}
          view={view}
          map={map}
          aftAzimuthDegrees={boomAzimuthDegrees}
          coordinateProjector={project}
        />
        {view === 'aft' ? (
          <>
            <AftSectionStack
              active={active}
              actual={actual}
              reference={reference}
              referenceMode={referenceMode}
            />
            <g className="geometry-perspective-key" aria-hidden="true">
              <rect x="12" y="11" width="112" height="18" />
              <text x="20" y="23">TRUE PERSPECTIVE</text>
              <text className="is-port" x="164" y="47">PORT</text>
              <text className="is-starboard" x={width - 14} y="47" textAnchor="end">STBD</text>
            </g>
          </>
        ) : null}
        <text x="14" y={height - 10} className="geometry-camera-note">{meta.note}</text>
      </svg>
    </figure>
  )
}

const PROFILE_LEFT = 24
const PROFILE_RIGHT = 336
const PROFILE_CHORD_Y = 80
const PROFILE_DEPTH_SCALE = 410

function profilePoints(row: SurfaceRow) {
  return surfaceRowProfile(row).map((point) => ({
    x: PROFILE_LEFT + point.u * (PROFILE_RIGHT - PROFILE_LEFT),
    y: PROFILE_CHORD_Y - point.depth * PROFILE_DEPTH_SCALE,
  }))
}

function profilePath(row: SurfaceRow) {
  const points = profilePoints(row)
  return `M${points.map((point) => `${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join('L')}`
}

function profileAreaPath(row: SurfaceRow) {
  return `${profilePath(row)}L${PROFILE_RIGHT} ${PROFILE_CHORD_Y}L${PROFILE_LEFT} ${PROFILE_CHORD_Y}Z`
}

function measureStripe(surface: RigSurfaces['main'], level: SailLevel) {
  const lowerRotation = getLevelRow(surface, 'lower').rotationDegrees
  return measureSurfaceRow(getLevelRow(surface, level), lowerRotation)
}

function ShapeCheckRail({
  active,
  automatic,
  onActiveChange,
  onAutomatic,
}: {
  active: Focus
  automatic: boolean
  onActiveChange: (focus: Focus) => void
  onAutomatic: () => void
}) {
  const sailLabel = active.sail === 'main' ? 'メイン' : 'ジブ'
  const viewpoint = active.sail === 'main'
    ? 'ブーム中央・少し風上からヘッドへ'
    : 'フット中央・デッキ近くからヘッドへ'

  return (
    <section className="shape-check-rail" aria-labelledby="shape-check-title">
      <div className="shape-check-viewpoint">
        <span id="shape-check-title">ACTUAL BOAT / 実艇の観察位置</span>
        <strong>{sailLabel}：{viewpoint}</strong>
        <small>3本をラフからリーチまで同じ画角に入れる</small>
      </div>
      <ol className="shape-check-sequence" aria-label="セールシェイプの確認順">
        <li><b>01</b><span>条件・視点</span><small>風と画角を固定</small></li>
        <li><b>02</b><span>横線全体</span><small>3本を端まで追う</small></li>
        <li><b>03</b><span>断面</span><small>深さ → ピーク</small></li>
        <li><b>04</b><span>上下差</span><small>ツイスト・入口／出口</small></li>
        <li><b>05</b><span>一操作</span><small>操作前と比較</small></li>
      </ol>
      <div className="shape-check-focus">
        <div className="shape-check-focus-row" aria-label="観察するセール">
          <button type="button" className={automatic ? 'is-active' : ''} aria-pressed={automatic} onClick={onAutomatic}>操作連動</button>
          {(['main', 'jib'] as const).map((sail) => (
            <button
              key={sail}
              type="button"
              className={!automatic && active.sail === sail ? 'is-active' : ''}
              aria-pressed={!automatic && active.sail === sail}
              onClick={() => onActiveChange({ ...active, sail })}
            >{sail === 'main' ? 'メイン' : 'ジブ'}</button>
          ))}
        </div>
        <div className="shape-check-focus-row is-level" aria-label="観察する高さ">
          {(['lower', 'middle', 'upper'] as const).map((level) => (
            <button
              key={level}
              type="button"
              className={!automatic && active.level === level ? 'is-active' : ''}
              aria-pressed={!automatic && active.level === level}
              onClick={() => onActiveChange({ ...active, level })}
            >{level === 'lower' ? '25%' : level === 'middle' ? '50%' : '75%'}</button>
          ))}
        </div>
        <p><b>STRIPE = SHAPE</b><span>テルテール／リーチリボンは流れを確認</span></p>
      </div>
    </section>
  )
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
  const current = measureStripe(actual[active.sail], active.level)
  const compared = measureStripe(reference[active.sail], active.level)
  const currentPeakX = PROFILE_LEFT + current.draftPosition * (PROFILE_RIGHT - PROFILE_LEFT)
  const referencePeakX = PROFILE_LEFT + compared.draftPosition * (PROFILE_RIGHT - PROFILE_LEFT)
  const currentPeakY = PROFILE_CHORD_Y - current.draftDepth * PROFILE_DEPTH_SCALE
  const referencePeakY = PROFILE_CHORD_Y - compared.draftDepth * PROFILE_DEPTH_SCALE
  const sailLabel = active.sail === 'main' ? 'メイン' : 'ジブ'
  const referenceLabel = referenceMode === 'previous' ? '操作前' : '基準'
  const stripeReadings = (['lower', 'middle', 'upper'] as const).map((level) => {
    return {
      level,
      actual: measureStripe(actual[active.sail], level),
      compared: measureStripe(reference[active.sail], level),
    }
  })

  return (
    <div className="geometry-inspector" aria-live="polite">
      <div className="geometry-profile-title">
        <span>MEASURED SECTION</span>
        <strong>{sailLabel}・{LEVEL_LABELS[active.level]}</strong>
        <small>深さ → ピーク → 縁 → ツイスト</small>
      </div>
      <svg className={`is-${active.sail}`} viewBox="0 0 360 126" role="img" aria-label={`${sailLabel}${LEVEL_LABELS[active.level]}。深さ${(current.draftDepth * 100).toFixed(1)}%、ピーク位置${Math.round(current.draftPosition * 100)}%`}>
        <path className="geometry-profile-current-fill" d={profileAreaPath(currentRow)} />
        <path className="geometry-profile-chord" d={`M${PROFILE_LEFT} ${PROFILE_CHORD_Y}H${PROFILE_RIGHT}`} />
        <path className={`geometry-profile-target is-${referenceMode}`} d={profilePath(referenceRow)} />
        <path className="geometry-profile-current" d={profilePath(currentRow)} />
        <circle className={`geometry-profile-target-point is-${referenceMode}`} cx={referencePeakX} cy={referencePeakY} r="3.2" />
        <circle className="geometry-profile-current-point" cx={currentPeakX} cy={currentPeakY} r="3.7" />
        <path className="geometry-profile-depth-measure" d={`M${currentPeakX} ${PROFILE_CHORD_Y}V${currentPeakY}`} />
        <path className="geometry-profile-position-measure" d={`M${PROFILE_LEFT} 103H${currentPeakX}`} />
        <path className="geometry-profile-measure-ticks" d={`M${currentPeakX - 4} ${PROFILE_CHORD_Y}H${currentPeakX + 4}M${currentPeakX - 4} ${currentPeakY}H${currentPeakX + 4}M${PROFILE_LEFT} 99V107M${currentPeakX} 99V107`} />
        <text className="geometry-profile-depth-label" x={currentPeakX + 7} y={(PROFILE_CHORD_Y + currentPeakY) / 2}>{`深さ ${(current.draftDepth * 100).toFixed(1)}%c`}</text>
        <text className="geometry-profile-position-label" x={(PROFILE_LEFT + currentPeakX) / 2} y="117" textAnchor="middle">{`ピーク位置 ${Math.round(current.draftPosition * 100)}%c`}</text>
        <text x={PROFILE_LEFT} y="94">LUFF 0%</text><text x={PROFILE_RIGHT} y="94" textAnchor="end">LEECH 100%</text>
      </svg>
      <div className="geometry-stripe-readings" aria-label={`${sailLabel}の3本のドラフトストライプ`}>
        {stripeReadings.map((reading) => (
          <div key={reading.level} className={reading.level === active.level ? 'is-selected' : ''}>
            <span>{LEVEL_LABELS[reading.level]}</span>
            <strong>深さ {(reading.actual.draftDepth * 100).toFixed(1)}%</strong>
            <b>ピーク {Math.round(reading.actual.draftPosition * 100)}%</b>
            <em>ツイスト {reading.actual.twist.toFixed(1)}° · 入口 {reading.actual.entryAngle.toFixed(1)}° · 出口 {reading.actual.exitAngle.toFixed(1)}°</em>
            <small>{referenceLabel} 深さ {(reading.compared.draftDepth * 100).toFixed(1)}% / ピーク {Math.round(reading.compared.draftPosition * 100)}% / ツイスト {reading.compared.twist.toFixed(1)}°</small>
          </div>
        ))}
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
  const suggestedFocus = focusForControl(focusControl)
  const [inspectionFocus, setInspectionFocus] = useState<Focus | null>(null)
  const active = inspectionFocus ?? suggestedFocus
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
            <p>SAIL SCAN METHOD / THREE STRIPES / ONE CHANGE AT A TIME</p>
            <h2 id="boat-view-title">{boat}のセールシェイプを、正しい位置と順番で確認する</h2>
          </div>
        </div>
        <div className="geometry-head-tools">
          <span className="geometry-condition">
            {geometryReference} · TWA {angle}° → AWA {result.apparentWindAngle.toFixed(1)}° · {windSpeed} kt · ブーム 中心線から {result.actual.main.angle.toFixed(1)}°
          </span>
          <div className="geometry-legend" aria-label="形状の凡例">
            <span><i className="legend-main" />メイン</span>
            <span><i className="legend-jib" />ジブ</span>
            <span><i className="legend-draft" />ストライプ／ピーク</span>
            <span><i className="legend-black-band" />ブラックバンド</span>
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

      <ShapeCheckRail
        active={active}
        automatic={inspectionFocus === null}
        onActiveChange={setInspectionFocus}
        onAutomatic={() => setInspectionFocus(null)}
      />

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
