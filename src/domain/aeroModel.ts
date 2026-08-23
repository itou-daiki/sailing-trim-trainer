import type { SailLevel, SailPair, SailSection } from './types'

export type AeroResult = {
  efficiency: number
  driveRatio: number
  liftCoefficient: number
  dragCoefficient: number
  driveCoefficient: number
  referenceDriveCoefficient: number
  liftToDrag: number
}

export type AeroContext = {
  trueWindAngle: number
  apparentWindAngle: number
}

const LEVELS = ['lower', 'middle', 'upper'] as const
const LEVEL_WEIGHTS: Record<SailLevel, number> = {
  lower: 0.38,
  middle: 0.37,
  upper: 0.25,
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const inverseLerp = (start: number, end: number, value: number) =>
  clamp((value - start) / (end - start), 0, 1)

function sectionCoefficients(
  actual: SailSection,
  target: SailSection,
  sail: 'main' | 'jib',
  level: SailLevel,
  context: AeroContext,
) {
  // This is a dimensionless teaching proxy, not a measured sail polar.
  // NASA: Cl depends on geometry and angle of attack, and lift scales with dynamic pressure.
  // https://www.grc.nasa.gov/WWW/k-12/FoilSim/Manual/fsim0007.htm
  // NASA: total drag combines base and lift-induced terms; Cdi = Cl² / (pi AR e).
  // https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/induced-drag-coefficient/
  const course = inverseLerp(42, 150, context.trueWindAngle)
  const targetAlpha = (10 - course * 4.2) * Math.PI / 180
  const twistTolerance = level === 'upper' ? 2.4 : level === 'middle' ? 1.7 : 0.9
  const depthTolerance = sail === 'main' ? 0.011 : 0.012
  const positionTolerance = 0.024
  const depthError = (actual.draftDepth - target.draftDepth) / depthTolerance
  const positionError = (actual.draftPosition - target.draftPosition) / positionTolerance
  const twistError = (actual.twist - target.twist) / twistTolerance
  const alpha = targetAlpha - ((actual.twist - target.twist) * Math.PI) / 180
  const camberAngle = actual.draftDepth * 0.28
  const flowQuality = Math.exp(
    -0.08 * depthError ** 2 -
    0.075 * positionError ** 2 -
    0.055 * twistError ** 2,
  )
  const liftCoefficient = Math.max(0.04, 2 * Math.PI * (alpha + camberAngle) * flowQuality)
  const aspectRatio = sail === 'main' ? 4.2 : 3.5
  const spanEfficiency = sail === 'main' ? 0.76 : 0.72
  const baseDrag = 0.026 + Math.max(0, actual.draftDepth - 0.08) * 0.16
  const inducedDrag = liftCoefficient ** 2 / (Math.PI * aspectRatio * spanEfficiency)
  const shapeDrag =
    0.012 * depthError ** 2 +
    0.009 * positionError ** 2 +
    0.007 * twistError ** 2
  const dragCoefficient = baseDrag + inducedDrag + shapeDrag
  const apparentAngle = clamp(context.apparentWindAngle, 0, 180) * Math.PI / 180
  const driveCoefficient = Math.max(
    0.015,
    liftCoefficient * Math.sin(apparentAngle) - dragCoefficient * Math.cos(apparentAngle),
  )

  return { liftCoefficient, dragCoefficient, driveCoefficient }
}

function integrate(pair: SailPair, reference: SailPair, context: AeroContext) {
  let lift = 0
  let drag = 0
  let drive = 0
  let totalWeight = 0

  for (const sail of ['main', 'jib'] as const) {
    const sailWeight = sail === 'main' ? 1 : 0.62
    for (const level of LEVELS) {
      const weight = sailWeight * LEVEL_WEIGHTS[level]
      const coefficients = sectionCoefficients(
        pair[sail].sections[level],
        reference[sail].sections[level],
        sail,
        level,
        context,
      )
      lift += coefficients.liftCoefficient * weight
      drag += coefficients.dragCoefficient * weight
      drive += coefficients.driveCoefficient * weight
      totalWeight += weight
    }
  }

  return {
    liftCoefficient: lift / totalWeight,
    dragCoefficient: drag / totalWeight,
    driveCoefficient: drive / totalWeight,
  }
}

export function evaluateAero(
  actual: SailPair,
  reference: SailPair,
  context: AeroContext,
): AeroResult {
  const current = integrate(actual, reference, context)
  const target = integrate(reference, reference, context)
  const driveRatio = current.driveCoefficient / target.driveCoefficient
  const dragQuality = Math.min(
    1,
    Math.sqrt(target.dragCoefficient / current.dragCoefficient),
  )
  const efficiency = clamp(driveRatio * dragQuality * 100, 28, 100)

  return {
    efficiency,
    driveRatio: clamp(driveRatio * 100, 0, 100),
    liftCoefficient: current.liftCoefficient,
    dragCoefficient: current.dragCoefficient,
    driveCoefficient: current.driveCoefficient,
    referenceDriveCoefficient: target.driveCoefficient,
    liftToDrag: current.liftCoefficient / current.dragCoefficient,
  }
}
