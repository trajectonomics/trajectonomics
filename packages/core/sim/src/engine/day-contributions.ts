import { addTo } from "./add"
import type { DayFlows } from "./aggregate"
import { groupEntries, plannedTotal } from "./contribution-entries"
import type { DayLines, DayResults } from "./day-lines"
import { minBigInt } from "./min"

/** One Account's entries: an obligation is applied in full, a capped entry takes what is left of `remaining`. */
function splitGroup(
	group: DayFlows["contributionEntries"],
	remaining: bigint,
	asset: boolean,
	into: { readonly applied: Map<string, bigint>; readonly unfunded: Map<string, bigint> },
): void {
	let left = remaining
	for (const entry of group) {
		const taken = entry.obligation ? entry.amount : minBigInt(entry.amount, left)
		if (!entry.obligation) left -= taken
		addTo(into.applied, entry.flow, taken)
		if (asset) addTo(into.unfunded, entry.flow, entry.amount - taken)
	}
}

/** Each contribution Flow's share of its target's applied amount, in Scenario order, first come first served. */
export function splitContributions(results: DayResults): Pick<DayLines, "applied" | "unfunded"> {
	const { scenario, states, paidBy } = results
	const position = new Map(scenario.flows.map((flow, index) => [flow.id, index] as const))
	const entries = results.day.contributionEntries.filter((entry) => !entry.employer)
	entries.sort((a, b) => position.get(a.flow)! - position.get(b.flow)!)
	const lines = { applied: new Map<string, bigint>(), unfunded: new Map<string, bigint>() }
	for (const [target, group] of groupEntries(entries)) {
		const asset = states.get(target)?.rule.kind !== "liability"
		const capped = plannedTotal(group.filter((entry) => !entry.obligation))
		const remaining = asset
			? capped - (results.unfunded.get(target) ?? 0n)
			: (paidBy.get(target) ?? 0n)
		splitGroup(group, remaining, asset, lines)
	}
	return lines
}
