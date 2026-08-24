export type ProjectionView = 'top' | 'side' | 'aft'

export const SIDE_OBLIQUE_DEGREES = 18
export const SIDE_ELEVATION_DEGREES = 12
/** Default aft azimuth, retained for callers that need a stern-centre projection. */
export const AFT_VIEW_DEGREES = 0
export const SAIL_GEOMETRY_UNIT_MM = 1900
export const BOOM_END_CAMERA_OFFSET_MM = 520
export const BOOM_END_CAMERA_NEAR_MM = 50

export type Coordinate3D = { x: number; y: number; z: number }
export type CoordinateProjector = (
  point: Coordinate3D,
) => { x: number; y: number }

export type BoomEndCamera = {
  origin: Coordinate3D
  forward: Coordinate3D
  right: Coordinate3D
  up: Coordinate3D
  near: number
}

export type BoomEndProjectedPoint = {
  x: number
  y: number
  /** Distance from the camera along its forward axis, in model units. */
  depth: number
}

export type ProjectionMapper = (
  point: { x: number; y: number },
) => { x: number; y: number }

/**
 * Fits projected geometry without moving the selected camera axis off-centre.
 * Aft view centres the projected sightline x=0; plan view centres the hull
 * centreplane y=0. The other axis is fitted to its complete bounds.
 */
export function fitProjection(
  points: Array<{ x: number; y: number }>,
  width: number,
  height: number,
  view: ProjectionView,
  padding = 18,
): ProjectionMapper {
  const minX = Math.min(...points.map((point) => point.x))
  const maxX = Math.max(...points.map((point) => point.x))
  const minY = Math.min(...points.map((point) => point.y))
  const maxY = Math.max(...points.map((point) => point.y))
  const centredX = view === 'aft'
  const centredY = view === 'top'
  const xSpan = centredX
    ? Math.max(Math.abs(minX), Math.abs(maxX)) * 2
    : maxX - minX
  const ySpan = centredY
    ? Math.max(Math.abs(minY), Math.abs(maxY)) * 2
    : maxY - minY
  const scale = Math.min(
    (width - padding * 2) / Math.max(0.01, xSpan),
    (height - padding * 2) / Math.max(0.01, ySpan),
  )
  const usedWidth = xSpan * scale
  const usedHeight = ySpan * scale
  const offsetX = centredX ? width / 2 : (width - usedWidth) / 2 - minX * scale
  const offsetY = centredY ? height / 2 : (height - usedHeight) / 2 + maxY * scale

  return (point) => ({
    x: offsetX + point.x * scale,
    y: offsetY - point.y * scale,
  })
}

/**
 * Projects the shared 3D hull/rig coordinate system into the plan, oblique
 * side, or legacy orthographic aft basis. The true boom-end camera below uses
 * perspective because it needs a physical eye point and depth.
 */
export function projectCoordinate(
  point: Coordinate3D,
  view: ProjectionView,
  aftAzimuthDegrees = AFT_VIEW_DEGREES,
) {
  const oblique = (SIDE_OBLIQUE_DEGREES * Math.PI) / 180
  const elevation = (SIDE_ELEVATION_DEGREES * Math.PI) / 180
  const aftView = (aftAzimuthDegrees * Math.PI) / 180
  if (view === 'top') return { x: point.x, y: point.y }
  if (view === 'side') {
    return {
      x: point.x * Math.cos(oblique) + point.y * Math.sin(oblique),
      y:
        -point.x * Math.sin(elevation) * Math.sin(oblique) +
        point.y * Math.sin(elevation) * Math.cos(oblique) +
        point.z * Math.cos(elevation),
    }
  }
  return {
    x: point.y * Math.cos(aftView) - point.x * Math.sin(aftView),
    y: point.z,
  }
}

/**
 * Places an eye directly behind the boom end and points it through the boom
 * towards the mast. The 520 mm offset keeps the eye behind the transom of both
 * classes while staying close enough for the boom mouth to remain a useful
 * visual datum. Unlike the legacy aft orthographic view, this camera has a
 * real origin, so near geometry appears larger than the mast and sail head.
 */
export function createBoomEndCamera(
  boomStart: Coordinate3D,
  boomEnd: Coordinate3D,
  offsetMm = BOOM_END_CAMERA_OFFSET_MM,
): BoomEndCamera {
  const axisX = boomEnd.x - boomStart.x
  const axisY = boomEnd.y - boomStart.y
  const axisLength = Math.hypot(axisX, axisY)
  if (axisLength < 1e-12) {
    throw new Error('Boom-end camera requires a non-zero boom axis')
  }
  const aft = { x: axisX / axisLength, y: axisY / axisLength, z: 0 }
  const offset = offsetMm / SAIL_GEOMETRY_UNIT_MM
  const forward = { x: -aft.x, y: -aft.y, z: 0 }

  return {
    origin: {
      x: boomEnd.x + aft.x * offset,
      y: boomEnd.y + aft.y * offset,
      z: boomEnd.z,
    },
    forward,
    // Screen-right is the boat's starboard side when looking forward.
    right: { x: forward.y, y: -forward.x, z: 0 },
    up: { x: 0, y: 0, z: 1 },
    near: BOOM_END_CAMERA_NEAR_MM / SAIL_GEOMETRY_UNIT_MM,
  }
}

/** Perspective projection for the true boom-end teaching camera. */
export function projectBoomEndCoordinate(
  point: Coordinate3D,
  camera: BoomEndCamera,
): BoomEndProjectedPoint {
  const delta = {
    x: point.x - camera.origin.x,
    y: point.y - camera.origin.y,
    z: point.z - camera.origin.z,
  }
  const dot = (axis: Coordinate3D) =>
    delta.x * axis.x + delta.y * axis.y + delta.z * axis.z
  const depth = dot(camera.forward)
  const visibleDepth = Math.max(camera.near, depth)

  return {
    x: dot(camera.right) / visibleDepth,
    y: dot(camera.up) / visibleDepth,
    depth,
  }
}
