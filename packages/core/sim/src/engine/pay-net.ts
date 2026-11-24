import type { DateString, Scenario } from "../types"
import { type DayLines, withLines } from "./day-lines"
import type { LevySet } from "./levy-set"
import type { DateOutcome, DayTotals } from "./occurrence"
import { route } from "./route"
import type { StateMap } from "./state"
import type { TransferEntry } from "./transfer-entry"
import { applyTransfers, type Moved, NO_TRANSFERS, withTransfers } from "./transfers"

/** What routing a date's net needs: the Accounts, the date, its totals and the transfers still to land. */
export interface NetDay {
	readonly states: StateMap
	readonly scenario: Scenario
	readonly date: DateString
	readonly levies: LevySet | undefined
	/** The totals before any transfer. */
	readonly totals: DayTotals
	readonly transfers: readonly TransferEntry[]
	/** Builds the lines of the date, when the run tracks them, from what the transfers moved. */
	readonly lines: (moved: Moved) => DayLines | undefined
}

/** The totals with what the transfers moved, on the day and on its lines. */
function booked(totals: DayTotals, moved: Moved): DayTotals {
	const withMoved = withTransfers(totals, moved)
	if (withMoved.lines === undefined) return withMoved
	return {
		...withMoved,
		lines: { ...withMoved.lines, transfers: moved.by, unmoved: moved.unmoved },
	}
}

function drawThenMove(day: NetDay, net: bigint): DateOutcome {
	const { states, scenario, date, levies } = day
	const start = withLines(day.totals, day.lines(NO_TRANSFERS))
	const drawn = route(states, scenario, date, start, net, levies)
	if (drawn.problem !== undefined) return drawn
	const moved = applyTransfers(states, scenario, day.transfers, date, levies)
	return { ...drawn, totals: booked(drawn.totals, moved), problem: moved.problem }
}

/**
 * Moves the date's transfers and routes its net (ADR 0031). A net at or above zero lands the transfers
 * first, so the surplus refills an Account a transfer emptied; a net below zero draws the `withdraw`
 * list first, so a transfer only moves what the bill left and never turns a bill the plan can pay
 * into a Shortfall. Fees come after, in the caller.
 */
export function routeNet(day: NetDay, net: bigint): DateOutcome {
	if (net < 0n) return drawThenMove(day, net)
	const { states, scenario, date, levies } = day
	const moved = applyTransfers(states, scenario, day.transfers, date, levies)
	const totals = withLines(withTransfers(day.totals, moved), day.lines(moved))
	if (moved.problem !== undefined) return { totals, problem: moved.problem, runsOut: undefined }
	return route(states, scenario, date, totals, net, levies)
}
