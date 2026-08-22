import type {
  ControlKey,
  SailLevel,
  TrimResult,
} from './types'

export type ShapeFocus = { sail: 'main' | 'jib'; level: SailLevel }

export type ControlMove = {
  control: ControlKey
  from: number
  to: number
}

export type ShapeDelta = ShapeFocus & {
  draftDepthPoints: number
  draftPositionPoints: number
  twistDegrees: number
  mastBendPoints: number
}

const DEFAULT_FOCUS: ShapeFocus = { sail: 'main', level: 'middle' }

export const CONTROL_FOCUS: Partial<Record<ControlKey, ShapeFocus>> = {
  vang: { sail: 'main', level: 'upper' },
  cunningham: { sail: 'main', level: 'middle' },
  outhaul: { sail: 'main', level: 'lower' },
  chock: { sail: 'main', level: 'lower' },
  forePuller: { sail: 'main', level: 'middle' },
  aftPuller: { sail: 'main', level: 'middle' },
  jibHeight: { sail: 'jib', level: 'upper' },
  jibLeadForeAft: { sail: 'jib', level: 'upper' },
}

export function focusForControl(control?: ControlKey): ShapeFocus {
  return CONTROL_FOCUS[control ?? 'cunningham'] ?? DEFAULT_FOCUS
}

export function compareShapeChange(
  before: TrimResult,
  after: TrimResult,
  control: ControlKey,
): ShapeDelta {
  const focus = focusForControl(control)
  const beforeSail = before.actual[focus.sail]
  const afterSail = after.actual[focus.sail]
  const beforeSection = beforeSail.sections[focus.level]
  const afterSection = afterSail.sections[focus.level]

  return {
    ...focus,
    draftDepthPoints: (afterSection.draftDepth - beforeSection.draftDepth) * 100,
    draftPositionPoints: (afterSection.draftPosition - beforeSection.draftPosition) * 100,
    twistDegrees: afterSection.twist - beforeSection.twist,
    mastBendPoints: (afterSail.mastBend - beforeSail.mastBend) * 100,
  }
}
