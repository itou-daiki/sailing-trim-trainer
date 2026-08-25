import { useMemo, useState, type CSSProperties } from 'react'
import {
  buildBoomGeometry,
  buildMastGeometry,
  buildRigHardpoints,
  buildRigSurfaces,
  CLASS_RIG_SPECIFICATIONS,
  CLASS_SAIL_SPECIFICATIONS,
  createSternObservationCamera,
  fitProjection,
  getLevelRow,
  mastBendMillimeters,
  mastBendProfileMillimeters,
  measureSurfaceRow,
  projectBoomEndCoordinate,
  projectCoordinate,
  projectSurface,
  SAIL_GEOMETRY_UNIT_MM,
  STERN_CAMERA_DISTANCE_IN_HULL_LENGTHS,
  surfaceRowProfile,
} from '../domain/sailGeometry'
import { diagnoseMainCloth, type MainClothState } from '../domain/sailCloth'
import {
  buildHullGeometry,
  HULL_SPECIFICATIONS,
  type HullPoint,
} from '../domain/hullGeometry'
import { focusForControl } from '../domain/shapeComparison'
import type { ControlMove } from '../domain/shapeComparison'
import { mastControlExplanation } from '../domain/mastResponse'
import { calculateTrim, CONTROL_LABELS, outhaulEaseMillimeters } from '../domain/trimModel'
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
  MastBendProfile,
  SailLevel,
  TrimControls,
  TrimResult,
} from '../domain/types'

type BoatViewProps = {
  boat: BoatClass
  angle: number
  windSpeed: number
  controls: TrimControls
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
type AftDisplayMode = 'shape' | 'boat'

type Focus = { sail: 'main' | 'jib'; level: SailLevel }

const AFT_SHAPE_LENS_SCALE = 3

const VIEW_META: Record<
  ProjectionView,
  { index: string; view: string; title: string; note: string }
> = {
  top: {
    index: '01',
    view: 'PLAN / 上から',
    title: '開き・ドラフト／マストベンド',
    note: 'セールの開きと、マストの前後偏位を上から読む',
  },
  side: {
    index: '02',
    view: 'SIDE / 斜め横',
    title: 'ラフからリーチ／後傾・ベンド',
    note: 'ストライプと、後傾基準線からの曲がりを同じ側面で読む',
  },
  aft: {
    index: '03',
    view: 'STERN / 真後ろ',
    title: '実艇後方／奥行きベンド',
    note: '真後ろで重なる前後ベンドを、上・中・下の奥行き量で読む',
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
  preserveAftSightline = true,
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
  // The true view keeps the camera axis on the screen centre. The shape lens
  // keeps the same camera and geometry, but crops around the sail itself so a
  // narrow boom-aft perspective does not waste half of the learning panel.
  const fitView = view === 'aft' && !preserveAftSightline ? 'side' : view
  const fitted = fitProjection(all, width, height, fitView, view === 'aft' ? 38 : 18)
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
      <title>{`${boat}級の外板、甲板、コクピット、センターボードケース`}</title>
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
  showAftMouthLabel = true,
}: {
  boom: BoomGeometry
  view: ProjectionView
  map: Mapper
  aftAzimuthDegrees?: number
  coordinateProjector?: CoordinateProjector
  showAftMouthLabel?: boolean
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
      {view === 'aft' && showAftMouthLabel ? (
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
  canvasWidth,
  aftShapeLens,
  aftAzimuthDegrees,
  coordinateProjector,
  reference,
  referenceMode,
  bendMillimeters,
}: {
  mast: MastGeometry
  view: ProjectionView
  map: Mapper
  canvasWidth: number
  aftShapeLens?: boolean
  aftAzimuthDegrees?: number
  coordinateProjector?: CoordinateProjector
  reference: boolean
  referenceMode?: ComparisonMode
  bendMillimeters: number
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
  const bendReadings = !reference && mast.centreline.length > 2
    ? (() => {
        const lower = mast.centreline[0]
        const upper = mast.centreline.at(-1)!
        const axis = {
          x: upper.x - lower.x,
          y: upper.y - lower.y,
          z: upper.z - lower.z,
        }
        const axisLengthSquared = axis.x ** 2 + axis.y ** 2 + axis.z ** 2
        const readingForPoint = (point: MastGeometry['centreline'][number]) => {
          const amount = (
            (point.x - lower.x) * axis.x +
            (point.y - lower.y) * axis.y +
            (point.z - lower.z) * axis.z
          ) / Math.max(1e-9, axisLengthSquared)
          const baseline = {
            x: lower.x + axis.x * amount,
            y: lower.y + axis.y * amount,
            z: lower.z + axis.z * amount,
          }
          return {
            point,
            baseline,
            distance: Math.hypot(
              point.x - baseline.x,
              point.y - baseline.y,
              point.z - baseline.z,
            ),
          }
        }
        const candidates = mast.centreline.slice(1, -1).map(readingForPoint)
        const maximum = candidates.reduce((current, candidate) =>
          candidate.distance > current.distance ? candidate : current,
        )
        const luffStations = mast.centreline.slice(1)
        const stations = ([
          ['upper', 0.75, 'TOP'],
          ['middle', 0.5, 'MID'],
          ['lower', 0.25, 'LOW'],
        ] as const).map(([level, height, label]) => {
          const index = Math.round((luffStations.length - 1) * height)
          return {
            level,
            height,
            label,
            ...readingForPoint(luffStations[index]),
          }
        })
        return {
          maximum,
          stations,
          straight: [lower, upper],
        }
      })()
    : undefined
  const bendMeasure = bendReadings && view !== 'aft'
    ? {
        mast: map(projectPoint(bendReadings.maximum.point)),
        baseline: map(projectPoint(bendReadings.maximum.baseline)),
        straight: bendReadings.straight.map((point) => map(projectPoint(point))),
      }
    : undefined
  const aftReadings = bendReadings && view === 'aft'
    ? bendReadings.stations.map((reading) => ({
        ...reading,
        screen: map(projectPoint(reading.point)),
        millimeters: reading.distance * SAIL_GEOMETRY_UNIT_MM,
      }))
    : []
  const planReadings = bendReadings && view === 'top'
    ? bendReadings.stations.map((reading) => ({
        ...reading,
        screen: map(projectPoint(reading.point)),
        millimeters: reading.distance * SAIL_GEOMETRY_UNIT_MM,
      }))
    : []
  const measuredBendMillimeters = bendReadings
    ? bendReadings.maximum.distance * SAIL_GEOMETRY_UNIT_MM
    : bendMillimeters
  const viewLabel = view === 'top' ? 'PLAN / 上から' : 'SIDE / 斜め横'

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
      {bendMeasure ? (
        <g
          className={`geometry-mast-bend-measurement is-${view}`}
          aria-label={`${viewLabel}の現在のマスト。実寸最大たわみ${measuredBendMillimeters.toFixed(0)} mm`}
        >
          <title>{view === 'top'
            ? '上から見た後傾基準位置と、帆走中の前後ベンドを実寸で比較'
            : '後傾基準線と帆走中の立体マストを実寸で比較'}</title>
          <path className="geometry-mast-bend-baseline" d={path(bendMeasure.straight, (point) => point)} />
          <path className="geometry-mast-bend-measure" d={`M${bendMeasure.mast.x.toFixed(2)} ${bendMeasure.mast.y.toFixed(2)}L${bendMeasure.baseline.x.toFixed(2)} ${bendMeasure.baseline.y.toFixed(2)}`} />
          <circle cx={bendMeasure.mast.x} cy={bendMeasure.mast.y} r="2.6" />
          {view === 'side' ? (
            <text
              x={Math.min(bendMeasure.mast.x, bendMeasure.baseline.x) - 7}
              y={bendMeasure.mast.y - 8}
              textAnchor="end"
            >{`最大 ${measuredBendMillimeters.toFixed(0)} mm`}</text>
          ) : null}
        </g>
      ) : null}
      {planReadings.length ? (
        <g className="geometry-mast-plan-readings" aria-hidden="true">
          <text className="geometry-mast-plan-heading" x={canvasWidth - 118} y="13">
            {`MAST BEND · MAX ${measuredBendMillimeters.toFixed(0)} mm`}
          </text>
          {planReadings.map((reading, index) => {
            const labelX = canvasWidth - 118
            const labelY = 29 + index * 15
            return (
              <g key={reading.level} className={`geometry-mast-plan-reading is-${reading.level}`}>
                <circle cx={reading.screen.x} cy={reading.screen.y} r="3.2" />
                <path d={`M${(reading.screen.x + 4).toFixed(2)} ${reading.screen.y.toFixed(2)}L${(labelX - 8).toFixed(2)} ${labelY.toFixed(2)}`} />
                <text x={labelX} y={labelY + 2.5}>
                  {`${reading.label} · 前 ${reading.millimeters.toFixed(0)} mm`}
                </text>
              </g>
            )
          })}
        </g>
      ) : null}
      {aftReadings.length ? (
        <g
          className={`geometry-mast-depth-readings${aftShapeLens ? ' is-shape-lens' : ''}`}
          aria-label={`STERN / 真後ろのマストベンド。前後方向は奥行きに重なるため、上部${aftReadings[0].millimeters.toFixed(0)} mm、中部${aftReadings[1].millimeters.toFixed(0)} mm、下部${aftReadings[2].millimeters.toFixed(0)} mmを数値表示`}
        >
          <title>真後ろでは見えない前後ベンドを、マスト上の高さ別奥行き量で表示</title>
          {aftShapeLens ? (
            <>
              <text className="geometry-mast-depth-key-heading" x="18" y="48">BEND DEPTH / 奥行き</text>
              {aftReadings.map((reading, index) => {
                const keyY = 62 + index * 14
                return (
                  <g key={reading.level} className={`geometry-mast-depth-reading is-${reading.level}`}>
                    <circle cx={reading.screen.x} cy={reading.screen.y} r="3.2" />
                    <circle className="geometry-mast-depth-key-dot" cx="20" cy={keyY} r="2.5" />
                    <text x="28" y={keyY + 2.5}>
                      {`${reading.label} · ${reading.millimeters.toFixed(0)} mm`}
                    </text>
                  </g>
                )
              })}
            </>
          ) : aftReadings.map((reading) => (
              <g key={reading.level} className={`geometry-mast-depth-reading is-${reading.level}`}>
                <circle cx={reading.screen.x} cy={reading.screen.y} r="3.2" />
                <path d={`M${(reading.screen.x + 4).toFixed(2)} ${reading.screen.y.toFixed(2)}h12`} />
                <text x={reading.screen.x + 20} y={reading.screen.y + 2.5}>
                  {`${reading.label} · 奥 ${reading.millimeters.toFixed(0)} mm`}
                </text>
              </g>
            ))}
        </g>
      ) : null}
    </g>
  )
}

function pointAtProjectedSurface(
  surface: ProjectedSurface,
  height: number,
  u: number,
) {
  const rows = surface.rows
  const upperIndex = rows.findIndex((row) => row.height >= height)
  const lowerRow = rows[Math.max(0, upperIndex <= 0 ? 0 : upperIndex - 1)]
  const upperRow = rows[upperIndex < 0 ? rows.length - 1 : upperIndex]
  const pointOnRow = (row: (typeof rows)[number]) => {
    const scaled = Math.max(0, Math.min(1, u)) * (row.points.length - 1)
    const lowerIndex = Math.floor(scaled)
    const upperPointIndex = Math.min(row.points.length - 1, lowerIndex + 1)
    const amount = scaled - lowerIndex
    const lowerPoint = row.points[lowerIndex]
    const upperPoint = row.points[upperPointIndex]
    return {
      x: lowerPoint.x + (upperPoint.x - lowerPoint.x) * amount,
      y: lowerPoint.y + (upperPoint.y - lowerPoint.y) * amount,
    }
  }
  const lowerPoint = pointOnRow(lowerRow)
  const upperPoint = pointOnRow(upperRow)
  const amount = lowerRow === upperRow
    ? 0
    : (height - lowerRow.height) / (upperRow.height - lowerRow.height)
  return {
    x: lowerPoint.x + (upperPoint.x - lowerPoint.x) * amount,
    y: lowerPoint.y + (upperPoint.y - lowerPoint.y) * amount,
  }
}

function SurfaceLayer({
  surface,
  map,
  active,
  target,
  referenceMode,
  view,
  aftAnalysis = false,
  clothState,
}: {
  surface: ProjectedSurface
  map: Mapper
  active: Focus
  target: boolean
  referenceMode?: ComparisonMode
  view: ProjectionView
  aftAnalysis?: boolean
  clothState?: MainClothState
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
      {!target && surface.sail === 'main' && clothState?.traces.length ? (
        <g className={`geometry-cloth-wrinkles is-${clothState.status}`} aria-label={clothState.label}>
          {clothState.traces.map((trace) => (
            <path
              key={trace.id}
              className={`geometry-cloth-wrinkle is-${trace.kind}`}
              d={path(trace.points.map((point) => pointAtProjectedSurface(surface, point.height, point.u)), map)}
              style={{ '--wrinkle-severity': trace.severity } as CSSProperties}
            />
          ))}
        </g>
      ) : null}
      {!target && view === 'aft' && aftAnalysis && surface.sail === 'main' ? (
        <g className="geometry-aft-sail-edges" aria-hidden="true">
          <path className="geometry-aft-luff" d={path(surface.rows.map((row) => row.points[0]), map)} />
          <path className="geometry-aft-leech" d={path(surface.rows.map((row) => row.points.at(-1)!), map)} />
        </g>
      ) : null}
      {!target && view === 'aft' && aftAnalysis && surface.sail === 'main' ? (
        <g className="geometry-aft-chord-guides" aria-hidden="true">
          {surface.rows.filter((row) => row.level).map((row) => (
            <path
              key={`chord-guide-${row.level}`}
              className={row.level === active.level ? 'is-selected' : ''}
              d={path([row.points[0], row.points.at(-1)!], map)}
            />
          ))}
        </g>
      ) : null}
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
            {!target && view === 'aft' && aftAnalysis && surface.sail === 'main' ? (
              <text className="geometry-aft-stripe-label" x={peak.x + 7} y={peak.y - 6}>
                {row.level === 'lower' ? '25%' : row.level === 'middle' ? '50%' : '75%'}
              </text>
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

function ProjectionPanel({
  view,
  actual,
  reference,
  active,
  referenceMode,
  boat,
  mastBend,
  mastBendProfile,
  referenceMastBend,
  referenceMastBendProfile,
  aftDisplayMode,
  onAftDisplayModeChange,
  clothState,
  expanded,
  onToggleExpanded,
}: {
  view: ProjectionView
  actual: RigSurfaces
  reference: RigSurfaces
  active: Focus
  referenceMode: ComparisonMode
  boat: BoatClass
  mastBend: number
  mastBendProfile: MastBendProfile
  referenceMastBend: number
  referenceMastBendProfile: MastBendProfile
  aftDisplayMode: AftDisplayMode
  onAftDisplayModeChange: (mode: AftDisplayMode) => void
  clothState: MainClothState
  expanded: boolean
  onToggleExpanded: () => void
}) {
  const dimensions: Record<ProjectionView, { width: number; height: number }> = {
    top: { width: 760, height: 160 },
    side: { width: 500, height: 330 },
    aft: { width: 420, height: 330 },
  }
  const { width, height } = dimensions[view]
  const hull = buildHullGeometry(boat)
  const specification = HULL_SPECIFICATIONS[boat]
  const boom = buildBoomGeometry(boat, actual.main)
  const actualMastGeometry = buildMastGeometry(boat, mastBend, mastBendProfile)
  const referenceMastGeometry = buildMastGeometry(
    boat,
    referenceMastBend,
    referenceMastBendProfile,
  )
  const [boomStart, boomEnd] = boom.centreline
  const boomAzimuthDegrees = view === 'aft'
    ? Math.atan2(boomEnd.y - boomStart.y, boomEnd.x - boomStart.x) * 180 / Math.PI
    : undefined
  const sternTarget = view === 'aft'
    ? {
        x: 0,
        y: 0,
        z: boomStart.z + CLASS_SAIL_SPECIFICATIONS[boat].main.luffMm /
          SAIL_GEOMETRY_UNIT_MM * 0.47,
      }
    : undefined
  const transomDatum = {
    x: specification.mastFromAftMm / SAIL_GEOMETRY_UNIT_MM,
    y: 0,
    z: -40 / SAIL_GEOMETRY_UNIT_MM,
  }
  const sternCamera = view === 'aft' && sternTarget
    ? createSternObservationCamera(
        transomDatum,
        sternTarget,
        specification.lengthMm * STERN_CAMERA_DISTANCE_IN_HULL_LENGTHS,
      )
    : undefined
  const rigProject: CoordinateProjector = sternCamera
    ? (point) => projectBoomEndCoordinate(point, sternCamera)
    : (point) => projectCoordinate(point, view, boomAzimuthDegrees)
  const project: CoordinateProjector = view === 'aft' && aftDisplayMode === 'shape'
    ? (point) => {
        const projected = rigProject(point)
        return { x: projected.x * AFT_SHAPE_LENS_SCALE, y: projected.y }
      }
    : rigProject
  const actualProjected = view === 'aft'
    ? (aftDisplayMode === 'shape'
        ? [projectSurface(actual.main, view, boomAzimuthDegrees, project)]
        : [
            projectSurface(actual.jib, view, boomAzimuthDegrees, project),
            projectSurface(actual.main, view, boomAzimuthDegrees, project),
          ])
    : [
        projectSurface(actual.jib, view, boomAzimuthDegrees, project),
        projectSurface(actual.main, view, boomAzimuthDegrees, project),
      ]
  const referenceProjected = view === 'aft'
    ? (aftDisplayMode === 'shape'
        ? [projectSurface(reference.main, view, boomAzimuthDegrees, project)]
        : [
            projectSurface(reference.jib, view, boomAzimuthDegrees, project),
            projectSurface(reference.main, view, boomAzimuthDegrees, project),
          ])
    : [
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
  const projectedSailHeightMastPoints = [
    ...actualMastGeometry.sections.flat(),
    ...referenceMastGeometry.sections.flat(),
  ]
    .filter((point) => point.z >= boomStart.z - 0.04)
    .map(project)
  const rigHardpoints = buildRigHardpoints(boat, mastBend, mastBendProfile)
  const projectedHullPoints = hull.allPoints.map(project)
  const map = createMapper(
    [...actualProjected, ...referenceProjected],
    width,
    height,
    view,
    boat,
    view === 'aft'
      ? (aftDisplayMode === 'shape'
          ? [...projectedBoomPoints, ...projectedSailHeightMastPoints]
          : [...projectedHullPoints, ...projectedBoomPoints, ...projectedMastPoints])
      : [...projectedHullPoints, ...projectedBoomPoints, ...projectedMastPoints],
    !(view === 'aft' && aftDisplayMode === 'shape'),
  )
  const meta = VIEW_META[view]
  const classSails = CLASS_SAIL_SPECIFICATIONS[boat]
  const actualJibLuff = actualProjected
    .find((surface) => surface.sail === 'jib')
    ?.rows.map((row) => row.points[0]) ?? []
  const projectedStemhead = project(hull.jibTack)
  const projectedJibHalyardHoist = project(rigHardpoints.jibHalyardHoist)
  const jibTackStrop = actualJibLuff.length
    ? [projectedStemhead, actualJibLuff[0]]
    : []
  const jibLuffAndHalyard = actualJibLuff.length
    ? [projectedStemhead, ...actualJibLuff.slice(1), projectedJibHalyardHoist]
    : []
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
  const sternWaterY = view === 'aft' && aftDisplayMode === 'boat'
    ? map(project({ ...transomDatum, z: -0.13 })).y
    : undefined
  const orderedReference = [...referenceProjected].sort((a, b) =>
    Number(a.sail === active.sail) - Number(b.sail === active.sail))
  const orderedActual = [...actualProjected].sort((a, b) =>
    Number(a.sail === active.sail) - Number(b.sail === active.sail))
  const displayActive: Focus = view === 'aft'
    ? { sail: 'main', level: active.level }
    : active
  const aftMiddleRow = view === 'aft'
    ? actualProjected[0]?.rows.find((row) => row.level === 'middle')
    : undefined
  const aftLuff = aftMiddleRow ? map(aftMiddleRow.points[0]) : undefined
  const aftLeech = aftMiddleRow ? map(aftMiddleRow.points.at(-1)!) : undefined
  const cameraNote = view === 'aft'
    ? (aftDisplayMode === 'shape'
        ? `真後ろの同じカメラをセールへ拡大 · 横×${AFT_SHAPE_LENS_SCALE} · ベンドは奥行きmm`
        : '真後ろでは前後ベンドが奥行きに重なるため、TOP / MID / LOWのmmで読む')
    : meta.note

  return (
    <figure className={`geometry-panel geometry-panel-${view}${view === 'aft' ? ` is-${aftDisplayMode}` : ''}${expanded ? ' is-expanded' : ''}`}>
      <figcaption>
        <span>{meta.index}</span>
        <div>
          <strong>{meta.view}</strong>
          <small>{meta.title}{view === 'aft' ? ` · ${boat} M${classSails.main.battens.length}バテン` : ''}</small>
        </div>
        <div className="geometry-panel-tools">
          {view === 'aft' ? (
            <div className="geometry-aft-mode-switch" aria-label="後方ビューの表示">
              <button
                type="button"
                className={aftDisplayMode === 'shape' ? 'is-active' : ''}
                aria-pressed={aftDisplayMode === 'shape'}
                onClick={() => onAftDisplayModeChange('shape')}
              >形を読む</button>
              <button
                type="button"
                className={aftDisplayMode === 'boat' ? 'is-active' : ''}
                aria-pressed={aftDisplayMode === 'boat'}
                onClick={() => onAftDisplayModeChange('boat')}
              >実艇</button>
            </div>
          ) : null}
          <button
            type="button"
            className="geometry-panel-expand"
            aria-label={`${meta.view}を${expanded ? '3視点表示へ戻す' : '拡大する'}`}
            aria-pressed={expanded}
            onClick={onToggleExpanded}
          >
            <span aria-hidden="true">{expanded ? '3視点へ戻る' : '拡大'}</span>
          </button>
        </div>
      </figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${meta.view}。単一の3Dセール面を投影し、${cameraNote}。`}
      >
        {water.length ? <path className="geometry-waterline" d={path(water, map)} /> : null}
        {sternWaterY !== undefined ? (
          <g className="geometry-stern-waterline" aria-hidden="true">
            <path d={`M0 ${sternWaterY.toFixed(2)}H${width}`} />
            <text x="14" y={sternWaterY - 6}>WATERLINE / 水面</text>
          </g>
        ) : null}
        {aftCentreline.length ? (
          <path className="geometry-camera-centreline" d={path(aftCentreline, map)} />
        ) : null}
        {view !== 'aft' || aftDisplayMode === 'boat' ? (
          <HullLayer
            boat={boat}
            view={view}
            map={map}
            aftAzimuthDegrees={boomAzimuthDegrees}
            coordinateProjector={project}
          />
        ) : null}
        {view !== 'aft' || aftDisplayMode === 'boat' ? (
          <>
            <path className="geometry-jib-tack-strop" d={path(jibTackStrop, map)} />
            <path className="geometry-forestay" d={path(jibLuffAndHalyard, map)} />
          </>
        ) : null}
        <MastLayer
          mast={referenceMastGeometry}
          view={view}
          map={map}
          canvasWidth={width}
          aftShapeLens={view === 'aft' && aftDisplayMode === 'shape'}
          aftAzimuthDegrees={boomAzimuthDegrees}
          coordinateProjector={project}
          reference
          referenceMode={referenceMode}
          bendMillimeters={mastBendMillimeters(boat, referenceMastBend)}
        />
        {orderedReference.map((surface) => (
          <SurfaceLayer
            key={`reference-${surface.sail}`}
            surface={surface}
            map={map}
            active={displayActive}
            target
            referenceMode={referenceMode}
            view={view}
            aftAnalysis={view === 'aft' && aftDisplayMode === 'shape'}
          />
        ))}
        {orderedActual.map((surface) => (
          <SurfaceLayer
            key={surface.sail}
            surface={surface}
            map={map}
            active={displayActive}
            target={false}
            view={view}
            aftAnalysis={view === 'aft' && aftDisplayMode === 'shape'}
            clothState={clothState}
          />
        ))}
        <MastLayer
          mast={actualMastGeometry}
          view={view}
          map={map}
          canvasWidth={width}
          aftShapeLens={view === 'aft' && aftDisplayMode === 'shape'}
          aftAzimuthDegrees={boomAzimuthDegrees}
          coordinateProjector={project}
          reference={false}
          bendMillimeters={mastBendMillimeters(boat, mastBend)}
        />
        <BoomLayer
          boom={boom}
          view={view}
          map={map}
          aftAzimuthDegrees={boomAzimuthDegrees}
          coordinateProjector={project}
          showAftMouthLabel={view === 'aft' && aftDisplayMode === 'shape'}
        />
        {view === 'aft' && aftDisplayMode === 'shape' && aftLuff && aftLeech ? (
          <g className="geometry-aft-edge-labels" aria-hidden="true">
            <path d={`M${aftLuff.x.toFixed(2)} ${aftLuff.y.toFixed(2)}h-18`} />
            <text x={aftLuff.x - 22} y={aftLuff.y + 2} textAnchor="end">LUFF / ラフ</text>
            <path d={`M${aftLeech.x.toFixed(2)} ${aftLeech.y.toFixed(2)}h18`} />
            <text x={aftLeech.x + 22} y={aftLeech.y + 2}>LEECH / リーチ</text>
          </g>
        ) : null}
        {view === 'aft' ? (
          <g className="geometry-perspective-key" aria-hidden="true">
            <rect x="12" y="11" width={aftDisplayMode === 'shape' ? 154 : 188} height="18" />
            <text x="20" y="23">
              {aftDisplayMode === 'shape'
                ? `SHAPE LENS · WIDTH ×${AFT_SHAPE_LENS_SCALE}`
                : 'STERN OBSERVATION · FULL RIG'}
            </text>
          </g>
        ) : null}
        {view === 'aft' && aftDisplayMode === 'shape' ? (
          <g className="geometry-shape-reading-key" aria-hidden="true">
            <rect x="12" y={height - 32} width="246" height="20" />
            <path d={`M20 ${height - 21}h25`} />
            <text x="52" y={height - 18}>赤い曲線 − 点線 = セールの深さ</text>
          </g>
        ) : (
          <text x="14" y={height - 10} className="geometry-camera-note">{cameraNote}</text>
        )}
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

type StripeMeasurement = ReturnType<typeof measureStripe>

function diagnoseShapeDifference(
  delta: number,
  tolerance: number,
  referenceMode: ComparisonMode,
  targetLow: string,
  targetHigh: string,
  changeLow: string,
  changeHigh: string,
) {
  if (Math.abs(delta) <= tolerance) {
    return {
      label: referenceMode === 'target' ? '適正' : 'ほぼ同じ',
      tone: 'is-good',
    }
  }
  return {
    label: delta < 0
      ? (referenceMode === 'target' ? targetLow : changeLow)
      : (referenceMode === 'target' ? targetHigh : changeHigh),
    tone: 'is-warning',
  }
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
    ? 'ブーム後端の後方からセール中央へ見上げる'
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
  const selectedDiagnosis = [
    {
      key: '深さ',
      ...diagnoseShapeDifference(
        current.draftDepth - compared.draftDepth,
        0.004,
        referenceMode,
        'フラットすぎ',
        '深すぎ',
        '浅くなった',
        '深くなった',
      ),
    },
    {
      key: '位置',
      ...diagnoseShapeDifference(
        current.draftPosition - compared.draftPosition,
        0.015,
        referenceMode,
        '前すぎ',
        '後ろすぎ',
        '前へ移動',
        '後ろへ移動',
      ),
    },
    {
      key: '開き',
      ...diagnoseShapeDifference(
        current.twist - compared.twist,
        1.3,
        referenceMode,
        '閉じすぎ',
        '開きすぎ',
        '閉じた',
        '開いた',
      ),
    },
  ]
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
        <small>{referenceMode === 'target' ? '条件別の良い形との差' : '操作前からの変化'}</small>
        <div className="geometry-shape-diagnosis" aria-label={`${sailLabel}${LEVEL_LABELS[active.level]}の形状診断`}>
          {selectedDiagnosis.map((item) => (
            <div key={item.key} className={item.tone}>
              <span>{item.key}</span><b>{item.label}</b>
            </div>
          ))}
        </div>
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

function formatMovePosition(control: ControlKey, value: number) {
  if (control !== 'outhaul') return String(value)
  const millimeters = outhaulEaseMillimeters(value)
  if (millimeters === 0) return 'ブラックバンド'
  const formatted = Number.isInteger(millimeters) ? millimeters : millimeters.toFixed(1)
  return `バンドから ${formatted} mm`
}

const MAST_BEND_LENS_SCALE = 20

function mastBendTrace(mast: MastGeometry) {
  const lower = mast.centreline[0]
  const upper = mast.centreline.at(-1)
  if (!lower || !upper) throw new Error('A mast trace requires at least two stations')

  const baselineX = 52
  const topY = 8
  const bottomY = 60
  const span = Math.max(1e-9, upper.z - lower.z)
  const verticalScale = (bottomY - topY) / span
  const points = mast.centreline.map((point) => {
    const amount = (point.z - lower.z) / span
    const straightX = lower.x + (upper.x - lower.x) * amount
    return {
      x: baselineX + (point.x - straightX) * verticalScale * MAST_BEND_LENS_SCALE,
      y: bottomY - amount * (bottomY - topY),
    }
  })
  const maximum = points.reduce((current, point) =>
    Math.abs(point.x - baselineX) > Math.abs(current.x - baselineX) ? point : current,
  )

  return {
    baselineX,
    topY,
    bottomY,
    maximum,
    path: `M${points.map((point) => `${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join('L')}`,
  }
}

function MastBendTrace({
  phase,
  mast,
  bendMillimeters,
}: {
  phase: 'before' | 'after'
  mast: MastGeometry
  bendMillimeters: number
}) {
  const trace = mastBendTrace(mast)
  const phaseLabel = phase === 'before' ? '操作前' : '操作後'

  return (
    <div className={`mast-bend-trace is-${phase}`}>
      <div className="mast-bend-label">
        <span>マスト</span>
        <strong>{bendMillimeters.toFixed(0)}<small> mm</small></strong>
        <small>直線基準からの最大たわみ · 横変位 ×{MAST_BEND_LENS_SCALE}</small>
      </div>
      <svg viewBox="0 0 104 68" role="img" aria-label={`${phaseLabel}のマスト。最大たわみ${bendMillimeters.toFixed(0)} mm。艇首を左にして、直線基準との差を横方向${MAST_BEND_LENS_SCALE}倍で表示`}>
        <path className="mast-bend-straight" d={`M${trace.baselineX} ${trace.bottomY}V${trace.topY}`} />
        <path className="mast-bend-curve" d={trace.path} />
        <path className="mast-bend-measure" d={`M${trace.baselineX} ${trace.maximum.y}H${trace.maximum.x}`} />
        <circle className="mast-bend-point" cx={trace.maximum.x} cy={trace.maximum.y} r="3" />
        <text x="4" y="11">HEAD</text>
        <text className="mast-bend-direction" x="100" y="11" textAnchor="end">← BOW / 前</text>
        <text x="4" y="63">DECK</text>
        <text x="100" y="63" textAnchor="end">BEND ×{MAST_BEND_LENS_SCALE}</text>
      </svg>
    </div>
  )
}

function SectionTrace({
  phase,
  sail,
  level,
  row,
  reading,
  mast,
  mastBendMm,
  controlPosition,
}: {
  phase: 'before' | 'after'
  sail: Focus['sail']
  level: SailLevel
  row: SurfaceRow
  reading: StripeMeasurement
  mast: MastGeometry
  mastBendMm: number
  controlPosition: string
}) {
  const peakX = PROFILE_LEFT + reading.draftPosition * (PROFILE_RIGHT - PROFILE_LEFT)
  const peakY = PROFILE_CHORD_Y - reading.draftDepth * PROFILE_DEPTH_SCALE
  const phaseLabel = phase === 'before' ? '操作前' : '操作後'
  const sailLabel = sail === 'main' ? 'メイン' : 'ジブ'

  return (
    <figure className={`change-trace-card is-${phase} is-${sail}`}>
      <figcaption>
        <span>{phase === 'before' ? 'BEFORE' : 'AFTER'} / {phaseLabel}</span>
        <strong>{sailLabel}・{LEVEL_LABELS[level]}</strong>
        <small>{controlPosition}</small>
      </figcaption>
      <svg viewBox="0 0 360 108" role="img" aria-label={`${phaseLabel}の${sailLabel}${LEVEL_LABELS[level]}。深さ${(reading.draftDepth * 100).toFixed(1)}%、最大位置${Math.round(reading.draftPosition * 100)}%`}>
        <path className="change-trace-grid" d={`M${PROFILE_LEFT} 24H${PROFILE_RIGHT}M${PROFILE_LEFT} 52H${PROFILE_RIGHT}`} />
        <path className="change-trace-fill" d={profileAreaPath(row)} />
        <path className="change-trace-chord" d={`M${PROFILE_LEFT} ${PROFILE_CHORD_Y}H${PROFILE_RIGHT}`} />
        <path className="change-trace-line" d={profilePath(row)} />
        <path className="change-trace-depth" d={`M${peakX} ${PROFILE_CHORD_Y}V${peakY}`} />
        <circle className="change-trace-peak" cx={peakX} cy={peakY} r="4" />
        <text x={PROFILE_LEFT} y="99">LUFF 0%</text>
        <text x={peakX} y="99" textAnchor="middle">PEAK {Math.round(reading.draftPosition * 100)}%</text>
        <text x={PROFILE_RIGHT} y="99" textAnchor="end">LEECH 100%</text>
      </svg>
      <dl>
        <div><dt>深さ</dt><dd>{(reading.draftDepth * 100).toFixed(1)}<small>%c</small></dd></div>
        <div><dt>最大位置</dt><dd>{Math.round(reading.draftPosition * 100)}<small>%c</small></dd></div>
        <div><dt>ツイスト</dt><dd>{reading.twist.toFixed(1)}<small>°</small></dd></div>
      </dl>
      <MastBendTrace phase={phase} mast={mast} bendMillimeters={mastBendMm} />
    </figure>
  )
}

function BeforeAfterBench({
  boat,
  active,
  before,
  after,
  beforeMastBend,
  beforeMastBendProfile,
  afterMastBend,
  afterMastBendProfile,
  move,
}: {
  boat: BoatClass
  active: Focus
  before: RigSurfaces
  after: RigSurfaces
  beforeMastBend: number
  beforeMastBendProfile: MastBendProfile
  afterMastBend: number
  afterMastBendProfile: MastBendProfile
  move: ControlMove
}) {
  const beforeSurface = before[active.sail]
  const afterSurface = after[active.sail]
  const beforeRow = getLevelRow(beforeSurface, active.level)
  const afterRow = getLevelRow(afterSurface, active.level)
  const beforeReading = measureStripe(beforeSurface, active.level)
  const afterReading = measureStripe(afterSurface, active.level)
  const beforeMast = useMemo(
    () => buildMastGeometry(boat, beforeMastBend, beforeMastBendProfile),
    [beforeMastBend, beforeMastBendProfile, boat],
  )
  const afterMast = useMemo(
    () => buildMastGeometry(boat, afterMastBend, afterMastBendProfile),
    [afterMastBend, afterMastBendProfile, boat],
  )
  const beforeMastBendMm = mastBendMillimeters(boat, beforeMastBend)
  const afterMastBendMm = mastBendMillimeters(boat, afterMastBend)
  const depth = deltaReading(
    (afterReading.draftDepth - beforeReading.draftDepth) * 100,
    'pt',
    '深くなった',
    '浅くなった',
    0.05,
  )
  const position = deltaReading(
    (afterReading.draftPosition - beforeReading.draftPosition) * 100,
    'pt',
    '後ろへ移動',
    '前へ移動',
    0.05,
  )
  const twist = deltaReading(
    afterReading.twist - beforeReading.twist,
    '°',
    '開いた',
    '閉じた',
    0.05,
  )
  const mastBend = deltaReading(
    afterMastBendMm - beforeMastBendMm,
    ' mm',
    '曲がりが増えた',
    '曲がりが減った',
    0.5,
  )
  const sailLabel = active.sail === 'main' ? 'メイン' : 'ジブ'
  const focusLabel = `${sailLabel}・${LEVEL_LABELS[active.level]}`
  const beforePosition = `${CONTROL_LABELS[move.control]} ${formatMovePosition(move.control, move.from)}`
  const afterPosition = `${CONTROL_LABELS[move.control]} ${formatMovePosition(move.control, move.to)}`

  return (
    <section className="before-after-bench" aria-labelledby="change-trace-title">
      <p className="change-trace-announcement" aria-live="polite" aria-atomic="true">
        {`${CONTROL_LABELS[move.control]}。操作前${formatMovePosition(move.control, move.from)}、操作後${formatMovePosition(move.control, move.to)}。${focusLabel}は、深さ${depth.direction}、最大位置${position.direction}、ツイスト${twist.direction}。マストの曲がりは${mastBend.direction}。`}
      </p>
      <header className="change-trace-head">
        <span>CHANGE TRACE / 操作前後</span>
        <h3 id="change-trace-title">{CONTROL_LABELS[move.control]}で、{focusLabel}はどう変わった？</h3>
        <p>左は操作開始時のまま固定。右だけがスライダーに連動します。</p>
        <small>{formatMovePosition(move.control, move.from)} → {formatMovePosition(move.control, move.to)}</small>
      </header>

      <div className="change-trace-comparison">
        <SectionTrace
          phase="before"
          sail={active.sail}
          level={active.level}
          row={beforeRow}
          reading={beforeReading}
          mast={beforeMast}
          mastBendMm={beforeMastBendMm}
          controlPosition={beforePosition}
        />
        <div className="change-trace-arrow" aria-hidden="true">
          <span>SAME STRIPE</span>
          <b>→</b>
          <small>同じ高さ</small>
        </div>
        <SectionTrace
          phase="after"
          sail={active.sail}
          level={active.level}
          row={afterRow}
          reading={afterReading}
          mast={afterMast}
          mastBendMm={afterMastBendMm}
          controlPosition={afterPosition}
        />
      </div>

      <div className="change-trace-deltas" aria-label={`${focusLabel}の変化量`}>
        <div><span>深さの変化</span><strong>{depth.value}</strong><small>{depth.direction}</small></div>
        <div><span>最大位置の変化</span><strong>{position.value}</strong><small>{position.direction}</small></div>
        <div><span>ツイストの変化</span><strong>{twist.value}</strong><small>{twist.direction}</small></div>
        <div><span>マストの曲がり</span><strong>{mastBend.value}</strong><small>{mastBend.direction}</small></div>
      </div>
    </section>
  )
}

const MAST_STATION_META = [
  { level: 'upper', label: 'TOP / 上部', height: '75%' },
  { level: 'middle', label: 'MID / 中部', height: '50%' },
  { level: 'lower', label: 'LOW / 下部', height: '25%' },
] as const

function formatMastDelta(value: number) {
  if (Math.abs(value) < 0.05) return '≈ 0 mm'
  return `${value > 0 ? '+' : '−'}${Math.abs(value).toFixed(1)} mm`
}

function MastResponsePanel({
  boat,
  angle,
  windSpeed,
  controls,
  result,
}: {
  boat: BoatClass
  angle: number
  windSpeed: number
  controls: TrimControls
  result: TrimResult
}) {
  const cunninghamZero = useMemo(
    () => calculateTrim(boat, angle, windSpeed, { ...controls, cunningham: 0 }),
    [angle, boat, controls, windSpeed],
  )
  const currentStations = mastBendProfileMillimeters(
    boat,
    result.actual.main.mastBend,
    result.actual.main.mastBendProfile,
  )
  const zeroStations = mastBendProfileMillimeters(
    boat,
    cunninghamZero.actual.main.mastBend,
    cunninghamZero.actual.main.mastBendProfile,
  )
  const explanation = mastControlExplanation(boat, 'cunningham')
  const maximumBend = CLASS_RIG_SPECIFICATIONS[boat].loadedBendMaxMm

  return (
    <section className="mast-response-panel" aria-labelledby="mast-response-title">
      <header>
        <span>MAST LOAD MAP / マストの動き</span>
        <h3 id="mast-response-title">カニンガムを引くと、トップ側はどう曲がる？</h3>
        <small>他の設定を固定 · カニンガム 0 → {controls.cunningham}</small>
      </header>

      <div className="mast-load-paths" aria-label="カニンガムの荷重経路">
        <div className="is-primary">
          <em>主作用</em>
          <span>カニンガム ↓</span><b>→</b><span>ラフ張力 ↑</span><b>→</b><span>ドラフト 前へ</span>
        </div>
        <div className="is-secondary">
          <em>二次作用</em>
          <span>圧縮荷重 ↑</span><b>→</b><span>既存ベンドを増幅</span><b>→</b><span>上部が最も動く</span>
        </div>
      </div>

      <div className="mast-station-readout" aria-label="高さ別の前後ベンド">
        {MAST_STATION_META.map(({ level, label, height }) => {
          const current = currentStations[level]
          const delta = current - zeroStations[level]
          const stationStyle = {
            '--mast-station': `${Math.min(100, current / maximumBend * 100)}%`,
          } as CSSProperties
          return (
            <div key={level} className={`mast-station is-${level}`} style={stationStyle}>
              <span>{label}<small>{height}高さ</small></span>
              <i aria-hidden="true"><b /></i>
              <strong>{formatMastDelta(delta)}</strong>
              <small>現在 {current.toFixed(0)} mm</small>
            </div>
          )
        })}
      </div>

      <div className="mast-response-notes">
        <p><strong>主作用</strong>{explanation.primary}</p>
        <p><strong>なぜ曲がる</strong>{explanation.secondary}</p>
        <p><strong>読み違い注意</strong>{explanation.caution}</p>
      </div>
    </section>
  )
}

export function BoatView({
  boat,
  angle,
  windSpeed,
  controls,
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
  const [aftDisplayMode, setAftDisplayMode] = useState<AftDisplayMode>('boat')
  const [expandedView, setExpandedView] = useState<ProjectionView | null>(null)
  const active = inspectionFocus ?? suggestedFocus
  const actualSurfaces = useMemo(
    () => buildRigSurfaces(boat, result.actual),
    [boat, result.actual],
  )
  const previousSurfaces = useMemo(
    () => buildRigSurfaces(boat, previousResult.actual),
    [boat, previousResult.actual],
  )
  const referenceSurfaces = useMemo(
    () => comparisonMode === 'previous'
      ? previousSurfaces
      : buildRigSurfaces(boat, result.target),
    [boat, comparisonMode, previousSurfaces, result.target],
  )
  const referenceLabel = comparisonMode === 'previous' ? '操作前' : '基準形'
  const clothState = diagnoseMainCloth({
    boat,
    windSpeed,
    controls,
    targetControls: result.targetControls,
    mastBend: result.actual.main.mastBend,
    targetMastBend: result.target.main.mastBend,
  })
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
          <div className="geometry-compare-switch" aria-label="三面図に重ねる形">
            <button type="button" title="三面図に操作前の形を重ねる" className={comparisonMode === 'previous' ? 'is-active' : ''} disabled={!hasPrevious} aria-pressed={comparisonMode === 'previous'} onClick={() => onComparisonModeChange('previous')}>操作前</button>
            <button type="button" title="三面図に良い形の基準を重ねる" className={comparisonMode === 'target' ? 'is-active' : ''} aria-pressed={comparisonMode === 'target'} onClick={() => onComparisonModeChange('target')}>基準形</button>
          </div>
          <button type="button" className="geometry-share-button" onClick={onShareShape}>この形を共有 ↗</button>
        </div>
      </div>
      {shareStatus ? <p className="geometry-share-status" role="status">{shareStatus}</p> : null}

      <div className={`geometry-stage${expandedView ? ` is-expanded is-expanded-${expandedView}` : ''}`}>
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
            mastBendProfile={result.actual.main.mastBendProfile}
            referenceMastBend={
              comparisonMode === 'previous'
                ? previousResult.actual.main.mastBend
                : result.target.main.mastBend
            }
            referenceMastBendProfile={
              comparisonMode === 'previous'
                ? previousResult.actual.main.mastBendProfile
                : result.target.main.mastBendProfile
            }
            aftDisplayMode={aftDisplayMode}
            onAftDisplayModeChange={setAftDisplayMode}
            clothState={clothState}
            expanded={expandedView === view}
            onToggleExpanded={() => setExpandedView((current) => current === view ? null : view)}
          />
        ))}
      </div>

      <MastResponsePanel
        boat={boat}
        angle={angle}
        windSpeed={windSpeed}
        controls={controls}
        result={result}
      />

      <div className={`geometry-cloth-readout is-${clothState.tone}`} role="status">
        <span>CLOTH / シワを読む</span>
        <strong>{clothState.label}</strong>
        <p>{clothState.explanation}</p>
        <small>
          {`推定ベンド ${clothState.mastBendMm.toFixed(0)} mm · 基準 ${clothState.targetMastBendMm.toFixed(0)} mm · ${boat}ガイド ${CLASS_RIG_SPECIFICATIONS[boat].tuningPrebendRangeMm.join('–')} mm`}
        </small>
      </div>

      <ShapeCheckRail
        active={active}
        automatic={inspectionFocus === null}
        onActiveChange={setInspectionFocus}
        onAutomatic={() => setInspectionFocus(null)}
      />

      {lastMove ? (
        <BeforeAfterBench
          boat={boat}
          active={active}
          before={previousSurfaces}
          after={actualSurfaces}
          beforeMastBend={previousResult.actual.main.mastBend}
          beforeMastBendProfile={previousResult.actual.main.mastBendProfile}
          afterMastBend={result.actual.main.mastBend}
          afterMastBendProfile={result.actual.main.mastBendProfile}
          move={lastMove}
        />
      ) : (
        <>
          <SectionInspector
            active={active}
            actual={actualSurfaces}
            reference={referenceSurfaces}
            referenceMode={comparisonMode}
          />
          <div className="course-notice geometry-course-notice">
            <span>LIVE CAUSE → SHAPE</span>
            <p>{courseNotice}</p>
          </div>
        </>
      )}
    </section>
  )
}
