import type { AccountId, Scenario } from "../types"
import { addTo } from "./add"
import type { DayFlows } from "./aggregate"
import { splitContributions } from "./day-contributions"
import { employerLines } from "./day-employer"
import { saleLines } from "./day-sales"
import type { Planned } from "./derive"
import type { DatedEvent } from "./events"
import type { DayTotals } from "./occurrence"
import { occurrenceAmount } from "./occurrence-amount"
import type { StateMap } from "./state"
import type { Moved } from "./transfers"

/**
 * What one date landed, by Flow, Levy and Account, for the cash-flow breakdown. Built only when a run
 * tracks the breakdown, and every figure is the amount the engine applied on that date.
 */
export interface DayLines {
	/** Planned amount per income and expense Flow id before Prepayment; a withdrawal Flow's amount moved. */
	readonly planned: ReadonlyMap<string, bigint>
	/** Applied amount per contribution Flow id: a debt payment, an obligation or an asset grant, after the caps. */
	readonly applied: ReadonlyMap<string, bigint>
	/** Landed amount per employer Contribution Flow id: outside cashflow, so not in `applied` (ADR 0026). */
	readonly employer: ReadonlyMap<string, bigint>
	/** Unfunded amount per asset contribution Flow id. A debt payment capped at the owed amount is not. */
	readonly unfunded: ReadonlyMap<string, bigint>
	/** Prepayment per Levy id. */
	readonly prepaid: ReadonlyMap<string, bigint>
	/** Signed Settlement per Levy id. */
	readonly settled: ReadonlyMap<string, bigint>
	/** Taken through `cashflow.withdraw`, by each entry's position in the list as a string (ADR 0030). */
	readonly drawn: ReadonlyMap<string, bigint>
	/** Filled through `cashflow.surplus`, by Account id. */
	readonly surplus: ReadonlyMap<AccountId, bigint>
	/** Moved by each transfer Flow, outside cashflow (ADR 0031). */
	readonly transfers: ReadonlyMap<string, bigint>
	/** Planned by each transfer Flow and not moved: the source held less, was locked, or the loan owed less. */
	readonly unmoved: ReadonlyMap<string, bigint>
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
	/** What the date's transfers moved. */
	readonly moved: Moved
}

/** Attaches the lines to the day's totals; without them the totals are returned unchanged. */
export function withLines(totals: DayTotals, lines: DayLines | undefined): DayTotals {
	return lines === undefined ? totals : { ...totals, lines }
}

/** Replaces the routing figures of a day's lines: what `withdraw` took and what `surplus` filled. */
export function withRouting(
	totals: DayTotals,
	drawn: ReadonlyMap<string, bigint>,
	surplus: ReadonlyMap<AccountId, bigint>,
): DayTotals {
	if (totals.lines === undefined) return totals
	return { ...totals, lines: { ...totals.lines, drawn, surplus } }
}

function plannedLines(results: DayResults): Map<string, bigint> {
	const lines = new Map<string, bigint>()
	for (const event of results.events) {
		const { flow } = event
		if (flow.kind === "contribution" || flow.kind === "transfer") continue
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

/** The lines of one date, read from the engine's own totals, its Flows and its Accounts. */
export function dayLines(results: DayResults): DayLines {
	return {
		planned: new Map([...plannedLines(results), ...sales(results)]),
		...splitContributions(results),
		employer: employerLines(results.day.contributionEntries),
		prepaid: results.day.prepaidByLevy,
		settled: results.settled,
		drawn: new Map(),
		surplus: new Map(),
		transfers: results.moved.by,
		unmoved: results.moved.unmoved,
	}
}
