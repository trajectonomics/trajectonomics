import { flowRefsOf } from "../levy/refs"
import type { Flow } from "../types"
import { isDerived } from "../types"

/** Each Flow id's position by its first declaration. */
export function indexFlows(flows: readonly Flow[]): ReadonlyMap<string, number> {
	const index = new Map<string, number>()
	for (let position = 0; position < flows.length; position++) {
		const flow = flows[position]
		if (flow !== undefined && !index.has(flow.id)) index.set(flow.id, position)
	}
	return index
}

function flowAt(
	flows: readonly Flow[],
	index: ReadonlyMap<string, number>,
	id: string,
): Flow | undefined {
	const position = index.get(id)
	return position === undefined ? undefined : flows[position]
}

/** The ids of the earned income a Flow reads, directly or through a chain of Derived amounts. */
export function earnedReachedFrom(
	flows: readonly Flow[],
	index: ReadonlyMap<string, number>,
	start: string,
): ReadonlySet<string> {
	const seen = new Set<string>()
	const earned = new Set<string>()
	const stack = [start]
	while (stack.length > 0) {
		const id = stack.pop()!
		if (seen.has(id)) continue
		seen.add(id)
		const flow = flowAt(flows, index, id)
		if (flow === undefined) continue
		if (flow.kind === "income" && flow.earned) earned.add(id)
		if (isDerived(flow)) stack.push(...flowRefsOf(flow.derive))
	}
	return earned
}

/**
 * The ids of every earned income that some expense reads, directly or through a chain of Derived
 * amounts. It is empty unless the FI entry lets a Derived expense read earned income, which only
 * `retirementSpending` allows (`DERIVED_EXPENSE_READS_EARNED`).
 */
export function earnedReadByExpenses(flows: readonly Flow[]): ReadonlySet<string> {
	const index = indexFlows(flows)
	const reached = new Set<string>()
	for (const flow of flows) {
		if (flow.kind !== "expense") continue
		for (const id of earnedReachedFrom(flows, index, flow.id)) reached.add(id)
	}
	return reached
}
