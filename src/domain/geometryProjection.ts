export type ProjectionView = 'top' | 'side' | 'aft'

export const SIDE_OBLIQUE_DEGREES = 18
export const SIDE_ELEVATION_DEGREES = 12
/** Default aft azimuth, retained for callers that need a stern-centre projection. */
export const AFT_VIEW_DEGREES = 0
export const SAIL_GEOMETRY_UNIT_MM = 1900

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
 * Projects the shared 3D hull/rig coordinate system into one of the three
 * orthographic teaching cameras. Keeping this outside either model prevents
 * hull and sail geometry from acquiring different origins.
 */
export function projectCoordinate(
  point: { x: number; y: number; z: number },
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
