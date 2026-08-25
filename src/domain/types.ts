export type BoatClass = '420' | '470'

export type ControlKey =
  | 'mainSheet'
  | 'jibSheet'
  | 'vang'
  | 'cunningham'
  | 'outhaul'
  | 'crewHike'
  | 'crewForeAft'
  | 'centerboard'
  | 'chock'
  | 'jibHeight'
  | 'windwardSheet'
  | 'forePuller'
  | 'aftPuller'
  | 'jibLeadForeAft'
  | 'jibLeadInOut'

export type TrimControls = Record<ControlKey, number>

export type SailLevel = 'upper' | 'middle' | 'lower'

export type SailSection = {
  height: number
  draftDepth: number
  draftPosition: number
  twist: number
}

/**
 * Fore-and-aft mast response at the same three stations used for the sail
 * stripes. Values are normalized load signals; geometry converts them to the
 * class-specific loaded bend envelope.
 */
export type MastBendProfile = Record<SailLevel, number>

export type SailShape = {
  angle: number
  /** Normalized maximum forward deflection across the three mast stations. */
  mastBend: number
  /** Local bend distribution, allowing upper- and lower-mast motion to differ. */
  mastBendProfile: MastBendProfile
  /** Mainsail clew distance forward of the boom outer limit mark. */
  footEaseMm: number
  draftDepth: number
  draftPosition: number
  twist: number
  sections: Record<SailLevel, SailSection>
}

export type SailPair = {
  main: SailShape
  jib: SailShape
}

export type TrimMetrics = {
  efficiency: number
  speed: number
  heel: number
  leeway: number
  drive: number
  balance: number
  liftCoefficient: number
  dragCoefficient: number
  liftToDrag: number
}

export type Guidance = {
  tone: 'good' | 'watch' | 'adjust'
  label: string
  title: string
  explanation: string
  action: string
  control?: ControlKey
}

export type TrimAction = {
  control: ControlKey
  direction: string
  reason: string
  delta: number
  gain: number
  urgency: 'large' | 'small'
}

export type TrimResult = {
  actual: SailPair
  target: SailPair
  targetControls: TrimControls
  metrics: TrimMetrics
  guidance: Guidance
  actions: TrimAction[]
  apparentWindAngle: number
  apparentWindSpeed: number
  mainTrim: import('./windModel').MainTrimSolution
}
