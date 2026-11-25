import type { ResolvedCalendar } from "../calendar/business"
import { resolvedCalendar } from "../calendar/resolve"
import { buildEvents, type DatedEvent } from "../engine/events"
import type { ResolvedReturns } from "../engine/returns"
import type { Baseline, DateString, Scenario, Timeline } from "../types"
import type { FinancialIndependenceOptions } from "../types/financial-independence"
import { candidateMonths } from "./candidates"
import { baselinePrefix, levyPlan, type Prefix } from "./prefix"
import { type ScanGrid, scanGrid } from "./scan-grid"
import type { SearchInput } from "./search"
import { type WindowPlan, windowPlan } from "./windows"

export interface ScanBase {
	readonly baseline: Baseline
	readonly scenario: Scenario
	readonly timeline: Timeline
	readonly events: readonly DatedEvent[]
	readonly calendar: ResolvedCalendar | undefined
	readonly candidates: readonly DateString[]
	readonly windows: WindowPlan
	readonly grid: ScanGrid
}

/** The state-independent scan inputs; `undefined` when the candidate grid is empty. */
export function planBase(
	baseline: Baseline,
	scenario: Scenario,
	timeline: Timeline,
	options: FinancialIndependenceOptions,
): ScanBase | undefined {
	const candidates = candidateMonths(timeline)
	if (candidates.length === 0) return undefined
	const calendar = resolvedCalendar(scenario)
	const events = buildEvents(scenario, timeline, calendar)
	const levy = levyPlan(scenario, timeline, calendar)
	return {
		baseline,
		scenario,
		timeline,
		events,
		calendar,
		candidates,
		windows: windowPlan(scenario, timeline, options, candidates[0]!, calendar),
		grid: scanGrid(
			events,
			timeline,
			options,
			candidates[0]!,
			levy.settlementDates,
			calendar,
			scenario.economy.inflation,
		),
	}
}

/** Walks the unchanged Scenario once, saving states and Levy tallies before each candidate month. */
export function prefixFor(base: ScanBase, series?: ResolvedReturns): Prefix {
	return baselinePrefix(
		base.baseline,
		base.scenario,
		base.timeline,
		base.events,
		base.candidates,
		base.calendar,
		series,
		base.windows.reads,
	)
}

export function inputFor(base: ScanBase, prefix: Prefix): SearchInput {
	return {
		scenario: base.scenario,
		prefix,
		windows: base.windows,
		grid: base.grid,
	}
}
