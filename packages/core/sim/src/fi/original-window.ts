import type { ResolvedCalendar } from "../calendar/business"
import { type AccountValues, readerOn, unchangedValues } from "../engine/account-values"
import { plannedAmounts } from "../engine/derive"
import { buildEvents, type DatedEvent } from "../engine/events"
import { runEngine } from "../engine/run"
import { onceEventsOn } from "../milestone/gate-once"
import { landsAt } from "../milestone/gating"
import { deferredOnces, planMilestones } from "../milestone/spec"
import type { Baseline, DateString, Scenario, Timeline } from "../types"
import { buildWindow, type WindowOutcome } from "./expense-window"

/** The ungated plan through one date, and what a set of fire dates keeps of it. */
export interface OriginalSource {
	/** The plan's expense window when its gates open and close on `fires`. */
	windowFor(fires: ReadonlyMap<string, DateString>): WindowOutcome
}

type Fires = ReadonlyMap<string, DateString>

/**
 * The plan's events kept where `fires` let them land, as the walk lands them (ADR 0012). A Flow
 * ended by `endAt` counts until its fire date, and a deferred `once` Flow counts from its fire date.
 */
function landing(
	scenario: Scenario,
	events: readonly DatedEvent[],
	deferred: ReturnType<typeof deferredOnces>,
	fires: Fires,
): readonly DatedEvent[] {
	const injected = deferred.flatMap((item) => {
		const fire = fires.get(item.milestone)
		if (fire === undefined) return []
		return onceEventsOn([item], [item.milestone], fire, scenario.economy.inflation)
	})
	return [...events, ...injected].filter((event) => landsAt(fires, event.flow, event.date))
}

/** The expense one Landed date's events carry, or why their amounts cannot be planned. */
function dayExpense(
	scenario: Scenario,
	date: DateString,
	day: readonly DatedEvent[],
	values: AccountValues,
) {
	const planned = plannedAmounts(
		day,
		scenario.flows,
		date,
		scenario.economy.inflation,
		readerOn(values, date),
	)
	if (!planned.ok) return planned
	let amount = 0n
	for (const event of day) {
		if (event.flow.kind !== "expense") continue
		amount += event.amount ?? planned.planned.derived.get(event.flow.id) ?? 0n
	}
	return { ok: true as const, amount }
}

/** One amount per Landed date, which is what an expense window sums over. */
function measure(
	scenario: Scenario,
	events: readonly DatedEvent[],
	values: AccountValues,
): WindowOutcome {
	const days = new Map<DateString, DatedEvent[]>()
	for (const event of events) {
		const day = days.get(event.date) ?? []
		day.push(event)
		days.set(event.date, day)
	}
	const measurements: { readonly date: DateString; readonly amount: bigint }[] = []
	for (const [date, day] of days) {
		const measured = dayExpense(scenario, date, day, values)
		if (!measured.ok) return { ok: false, problem: measured.problem }
		measurements.push({ date, amount: measured.amount })
	}
	return { ok: true, window: buildWindow(measurements) }
}

/**
 * The plan's events through `last`, built on first use and once. A Scenario without Milestones
 * keeps every event as `buildEvents` builds it, and a derived Expense is evaluated on its own
 * Landed date.
 */
export function originalSource(
	baseline: Baseline,
	scenario: Scenario,
	timeline: Timeline,
	last: DateString,
	calendar: ResolvedCalendar | undefined,
): OriginalSource {
	const plan = planMilestones(scenario, calendar)
	const deferred = plan === undefined ? [] : deferredOnces(scenario, plan, calendar)
	const bounded = { ...timeline, horizon: last }
	const values = unchangedValues((observe) =>
		runEngine(baseline, scenario, bounded, [], undefined, false, false, { observe, gated: false }),
	)
	let events: readonly DatedEvent[] | undefined
	return {
		windowFor: (fires) => {
			events ??= buildEvents(scenario, bounded, calendar)
			return measure(
				scenario,
				plan === undefined ? events : landing(scenario, events, deferred, fires),
				values,
			)
		},
	}
}
