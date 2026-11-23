import { addMonthsClamped } from "../calendar/arith"
import type { DatedEvent } from "../engine/events"
import type { StateMap } from "../engine/state"
import type { DateString, Flow, MilestoneTerms } from "../types"
import { dayExpense } from "./day-expense"
import { type DayGroup, firstGroupOnOrAfter, planDays } from "./day-groups"
import type { PlanView } from "./expenses"
import { landsAt } from "./gating"
import { termed } from "./metrics"

/** The events of a Landed date that land as of `date`; the group's own list when all of them do. */
function landing(
	group: DayGroup,
	fires: ReadonlyMap<string, DateString>,
	date: DateString,
): readonly DatedEvent[] {
	if (!group.gated) return group.events
	const landed = group.events.filter((event) => landsAt(fires, event.flow, date))
	return landed.length === group.events.length ? group.events : landed
}

/** The gate state of the plan's gated Flows as of `date`, which is all a window's total reads of the fire dates. */
function gateKey(
	gates: readonly Flow[],
	fires: ReadonlyMap<string, DateString>,
	date: DateString,
): string {
	return gates.map((flow) => (landsAt(fires, flow, date) ? "1" : "0")).join("")
}

/** Sums the window `[date, to)`: each Landed date's planned expense, in `terms`. */
function sumWindow(
	plan: PlanView,
	fires: ReadonlyMap<string, DateString>,
	[date, to]: readonly [DateString, DateString],
	terms: MilestoneTerms,
	states: StateMap,
): bigint | undefined {
	let total = 0n
	const { groups } = planDays(plan.events)
	const end = firstGroupOnOrAfter(groups, to)
	for (let index = firstGroupOnOrAfter(groups, date); index < end; index++) {
		const group = groups[index]!
		const landed = landing(group, fires, date)
		if (landed.length === 0) continue
		const entry = dayExpense(landed, group.day, plan, states)
		if (entry.amount === undefined) return undefined
		if (terms === "nominal") total += entry.amount
		else {
			entry.real ??= termed(entry.amount, group.day, plan.start, plan.inflation, terms)
			total += entry.real
		}
	}
	return total
}

function windowTotal(
	plan: PlanView,
	fires: ReadonlyMap<string, DateString>,
	date: DateString,
	terms: MilestoneTerms,
	states: StateMap,
): bigint | undefined {
	const to = addMonthsClamped(date, 12)
	return to > plan.pastHorizon ? undefined : sumWindow(plan, fires, [date, to], terms, states)
}

/**
 * Planned expenses over `[date, date + 12 months)` of the Flows that land as of `date`. Partial when
 * the window runs past the horizon, and `undefined` then or when a planned Derived amount fails. An
 * `account` read is priced from `states` grown to the Landed date: `check()` lets a window beside
 * only an Account nothing changes, whose later value is its state as it stands (ADR 0020). When no
 * Derived amount reads an Account the total depends on the date, the terms and the gate state
 * alone, so a plan keeps it for every run that reads the same window.
 */
export function plannedExpenses(
	plan: PlanView,
	fires: ReadonlyMap<string, DateString>,
	date: DateString,
	terms: MilestoneTerms,
	states: StateMap,
): bigint | undefined {
	if (plan.cache === undefined) return windowTotal(plan, fires, date, terms, states)
	const { totals, gates } = planDays(plan.events)
	const key = `${date}|${terms}|${plan.pastHorizon}|${gateKey(gates, fires, date)}`
	if (totals.has(key)) return totals.get(key)
	const total = windowTotal(plan, fires, date, terms, states)
	totals.set(key, total)
	return total
}
