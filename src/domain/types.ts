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

export type SailShape = {
  angle: number
  /** Normalized forward deflection at the middle of the mast. */
  mastBend: number
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
