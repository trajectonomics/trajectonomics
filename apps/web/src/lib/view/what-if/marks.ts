import { type ItemMarks, marksOf, type WasField } from "./items"
import type { PlanChanges } from "./plan-changes"

/** The marks of every card, by item id: what the session changes in it, beside what the plan stores. */
export function marksFor<T extends { id: string }>(
	baseline: readonly T[],
	whatIf: readonly T[],
	list: string,
	changes: PlanChanges,
	fields: readonly (keyof T & WasField)[],
): Record<string, ItemMarks> {
	return Object.fromEntries(
		baseline.map((card) => [
			card.id,
			marksOf(
				card,
				whatIf.find((entry) => entry.id === card.id),
				changes.removals.includes(`${list}.${card.id}`),
				fields,
			),
		]),
	)
}
