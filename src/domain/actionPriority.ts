import type { ControlKey, TrimAction } from './types'

export function actionPriority(actions: TrimAction[]): ControlKey[] {
  return actions.map((action) => action.control)
}

/**
 * Keeps the recommendation order established when a condition or exercise
 * starts. Controls disappear only when they enter the accepted range. An empty
 * order means that the next deliberate change starts a fresh sequence.
 */
export function keepActionPriority(
  actions: TrimAction[],
  establishedOrder: ControlKey[],
): TrimAction[] {
  if (establishedOrder.length === 0) return actions
  const establishedRank = new Map(
    establishedOrder.map((control, index) => [control, index]),
  )
  return actions
    .filter((action) => establishedRank.has(action.control))
    .sort((left, right) =>
      establishedRank.get(left.control)! - establishedRank.get(right.control)!)
}
