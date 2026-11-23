import type { AccountId, Scenario } from "../types"
import { addTo } from "./add"
import type { ContributionEntry, DayFlows } from "./aggregate"
import { occurrenceAmount } from "./aggregate"
import { groupEntries, plannedTotal } from "./contribution-entries"
import { saleLines } from "./day-sales"
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
	/** Planned amount per income and expense Flow id before Prepayment; a withdrawal Flow's amount moved. */
	readonly planned: ReadonlyMap<string, bigint>
	/** Applied amount per contribution Flow id: a debt payment, an obligation or an asset grant, after the caps. */
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
	/** What each asset gave up to a sale on the date, by Account id. */
	readonly sold: ReadonlyMap<AccountId, bigint>
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

function plannedLines(results: DayResults): Map<string, bigint> {
	const lines = new Map<string, bigint>()
	for (const event of results.events) {
		const { flow } = event
		if (flow.kind === "contribution") continue
		if (flow.kind === "withdrawal" && results.states.get(flow.source)?.rule.kind === "asset")
			continue
		addTo(lines, flow.id, occurrenceAmount(event, results.planned))
	}
	return lines
}

function sales(results: DayResults): Map<string, bigint> {
	const { scenario, states, events, planned, sold } = results
	return saleLines(scenario, states, events, planned, sold)
}

/** One Account's entries: an obligation is applied in full, a capped entry takes what is left of `remaining`. */
function splitGroup(
	group: readonly ContributionEntry[],
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
function splitContributions(results: DayResults): Pick<DayLines, "applied" | "unfunded"> {
	const { scenario, states, paidBy } = results
	const position = new Map(scenario.flows.map((flow, index) => [flow.id, index] as const))
	const entries = [...results.day.contributionEntries]
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

/** The lines of one date, read from the engine's own totals, its Flows and its Accounts. */
export function dayLines(results: DayResults): DayLines {
	return {
		planned: new Map([...plannedLines(results), ...sales(results)]),
		...splitContributions(results),
		prepaid: results.day.prepaidByLevy,
		settled: results.settled,
		drawn: new Map(),
		surplus: new Map(),
	}
}
