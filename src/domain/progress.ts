import type { PredictionConfidence } from './challenges'

export const PROGRESS_KEY = 'trim-note-progress:v1'

export type ChallengeRecord = {
  attempts: number
  bestMoves?: number
  completed: boolean
  assisted: boolean
  predictionCorrect?: boolean
  predictionConfidence?: PredictionConfidence
  evidenceCorrect?: boolean
}

export type LearningProgress = {
  version: 1
  records: Record<string, ChallengeRecord>
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

export const EMPTY_PROGRESS: LearningProgress = { version: 1, records: {} }

export function parseProgress(raw: string | null): LearningProgress {
  if (!raw) return EMPTY_PROGRESS

  try {
    const parsed = JSON.parse(raw) as Partial<LearningProgress>
    if (parsed.version !== 1 || typeof parsed.records !== 'object' || !parsed.records) {
      return EMPTY_PROGRESS
    }
    return { version: 1, records: parsed.records as Record<string, ChallengeRecord> }
  } catch {
    return EMPTY_PROGRESS
  }
}

export function loadProgress(storage?: StorageLike): LearningProgress {
  if (!storage) return EMPTY_PROGRESS
  try {
    return parseProgress(storage.getItem(PROGRESS_KEY))
  } catch {
    return EMPTY_PROGRESS
  }
}

export function saveProgress(progress: LearningProgress, storage?: StorageLike) {
  if (!storage) return
  try {
    storage.setItem(PROGRESS_KEY, JSON.stringify(progress))
  } catch {
    // Private browsing, disabled storage, or a full quota must not stop practice.
  }
}

export function updateRecord(
  progress: LearningProgress,
  challengeId: string,
  update: (current: ChallengeRecord) => ChallengeRecord,
): LearningProgress {
  const current = progress.records[challengeId] ?? {
    attempts: 0,
    completed: false,
    assisted: false,
  }
  return {
    version: 1,
    records: {
      ...progress.records,
      [challengeId]: update(current),
    },
  }
}
