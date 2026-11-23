import type { Path } from "../check/codes"
import { flowRefsOf } from "../levy/refs"
import type { Derive, Flow } from "../types"
import { isDerived } from "../types"
import { compareIds } from "./order"

export interface DerivedEntry {
	readonly id: string
	readonly derive: Derive
	/** Path of the Flow's `derive`, for a negative result. */
	readonly path: Path
}

/** Index of each Flow id by its first declaration. */
function indexFlows(flows: readonly Flow[]): ReadonlyMap<string, number> {
	const index = new Map<string, number>()
	for (let position = 0; position < flows.length; position++) {
		const flow = flows[position]
		if (flow !== undefined && !index.has(flow.id)) index.set(flow.id, position)
	}
	return index
}

const orders = new WeakMap<readonly Flow[], readonly DerivedEntry[]>()

/** Derived Flows in dependency order, then Flow id. Empty when nothing derives; kept per Flow list. */
export function derivedOrder(flows: readonly Flow[]): readonly DerivedEntry[] {
	const kept = orders.get(flows)
	if (kept !== undefined) return kept
	const order = orderOf(flows)
	orders.set(flows, order)
	return order
}

function orderOf(flows: readonly Flow[]): readonly DerivedEntry[] {
	const index = indexFlows(flows)
	const seen = new Set<string>()
	const entries: DerivedEntry[] = []
	const visit = (id: string): void => {
		if (seen.has(id)) return
		const position = index.get(id)
		const flow = position === undefined ? undefined : flows[position]
		if (flow === undefined || !isDerived(flow)) return
		seen.add(id)
		for (const reference of flowRefsOf(flow.derive)) visit(reference)
		entries.push({ id, derive: flow.derive, path: ["scenario", "flows", position!, "derive"] })
	}
	for (const id of [...index.keys()].sort(compareIds)) visit(id)
	return entries
}
