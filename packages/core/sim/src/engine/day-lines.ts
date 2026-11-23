import type { AccountId, Scenario } from "../types"
import { addTo } from "./add"
import type { DayFlows } from "./aggregate"
import { occurrenceAmount } from "./aggregate"
import { groupEntries, plannedTotal } from "./contribution-entries"
import type { Planned } from "./derive"
import type { DatedEvent } from "./events"
import { minBigInt } from "./min"
import type { DayTotals } from "./occurrence"
import type { StateMap } from "./state"

/**
 * What one date landed, by Flow, Levy and Account, for the cash-flow breakdown. Built only when a run
 * tracks the breakdown, and every figure is the amount the engine applied on that date.
 */
export interface DayLines {
	/** Planned amount per income, expense and withdrawal Flow id, before Prepayment and any cap. */
	readonly planned: ReadonlyMap<string, bigint>
	/** Applied amount per contribution Flow id: a debt payment or an asset grant, after the caps. */
	readonly applied: ReadonlyMap<string, bigint>
	/** Unfunded amount per asset contribution Flow id. A debt payment capped at the owed amount is not. */
	readonly unfunded: ReadonlyMap<string, bigint>
	/** Prepayment per Levy id. */
	readonly prepaid: ReadonlyMap<string, bigint>
	/** Signed Settlement per Levy id. */
	readonly settled: ReadonlyMap<string, bigint>
	/** Taken through `cashflow.withdraw`, by Account id. */
	readonly drawn: ReadonlyMap<AccountId, bigint>
	/** Filled through `cashflow.surplus`, by Account id. */
	readonly surplus: ReadonlyMap<AccountId, bigint>
}

/** The date's results the breakdown reads, all computed by the engine before routing. */
export interface DayResults {
	readonly scenario: Scenario
	readonly states: StateMap
	readonly events: readonly DatedEvent[]
	readonly planned: Planned
	readonly day: DayFlows
	readonly settled: ReadonlyMap<string, bigint>
	readonly paidBy: ReadonlyMap<AccountId, bigint>
	readonly unfunded: ReadonlyMap<AccountId, bigint>
}

/** Attaches the lines to the day's totals; without them the totals are returned unchanged. */
export function withLines(totals: DayTotals, lines: DayLines | undefined): DayTotals {
	return lines === undefined ? totals : { ...totals, lines }
}

/** Replaces the routing figures of a day's lines: what `withdraw` took and what `surplus` filled. */
export function withRouting(
	totals: DayTotals,
	drawn: ReadonlyMap<AccountId, bigint>,
	surplus: ReadonlyMap<AccountId, bigint>,
): DayTotals {
	if (totals.lines === undefined) return totals
	return { ...totals, lines: { ...totals.lines, drawn, surplus } }
}

function plannedLines(events: readonly DatedEvent[], planned: Planned): Map<string, bigint> {
	const lines = new Map<string, bigint>()
	for (const event of events) {
		if (event.flow.kind !== "contribution") {
			addTo(lines, event.flow.id, occurrenceAmount(event, planned))
		}
	}
	return lines
}

/** Each contribution Flow's share of its target's applied amount, in Scenario order, first come first served. */
function splitContributions(results: DayResults): Pick<DayLines, "applied" | "unfunded"> {
	const { scenario, states, paidBy } = results
	const position = new Map(scenario.flows.map((flow, index) => [flow.id, index] as const))
	const entries = [...results.day.contributionEntries]
	entries.sort((a, b) => position.get(a.flow)! - position.get(b.flow)!)
	const applied = new Map<string, bigint>()
	const unfunded = new Map<string, bigint>()
	for (const [target, group] of groupEntries(entries)) {
		const asset = states.get(target)?.rule.kind !== "liability"
		let remaining = asset
			? plannedTotal(group) - (results.unfunded.get(target) ?? 0n)
			: (paidBy.get(target) ?? 0n)
		for (const entry of group) {
			const taken = minBigInt(entry.amount, remaining)
			remaining -= taken
			addTo(applied, entry.flow, taken)
			if (asset) addTo(unfunded, entry.flow, entry.amount - taken)
		}
	}
	return { applied, unfunded }
}

/** The lines of one date, read from the engine's own totals, its Flows and its Accounts. */
export function dayLines(results: DayResults): DayLines {
	return {
		planned: plannedLines(results.events, results.planned),
		...splitContributions(results),
		prepaid: results.day.prepaidByLevy,
		settled: results.settled,
		drawn: new Map(),
		surplus: new Map(),
	}
}
