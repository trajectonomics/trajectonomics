import type { ResolvedCalendar } from "../calendar/business"
import { buildEvents, type DatedEvent } from "../engine/events"
import { runEngine } from "../engine/run"
import { onceEventsOn } from "../milestone/gate-once"
import { landsAt } from "../milestone/gating"
import { deferredOnces, planMilestones } from "../milestone/spec"
import type { Baseline, DateString, Scenario, Timeline } from "../types"
import type { ProjectionProblem } from "../types/projection"

/**
 * The plan's Flow events through `through`, kept only where their Milestone gates let them land, as
 * the walk lands them (ADR 0012). A Flow ended by `endAt` counts until its fire date, and a deferred
 * `once` Flow counts from its fire date. Fire dates come from a run of the unchanged Scenario. A
 * Scenario without Milestones keeps every event as `buildEvents` builds it.
 */
export function gatedEvents(
	baseline: Baseline,
	scenario: Scenario,
	timeline: Timeline,
	through: DateString,
	calendar: ResolvedCalendar | undefined,
): readonly DatedEvent[] | ProjectionProblem {
	const window = { ...timeline, horizon: through }
	const events = buildEvents(scenario, window, calendar)
	const plan = planMilestones(scenario, calendar)
	if (plan === undefined) return events
	const run = runEngine(baseline, scenario, window, [])
	if (!run.ok) return run.problem
	const fires = new Map<string, DateString>()
	for (const item of run.run.milestones ?? []) {
		if (item.reached) fires.set(item.id, item.date)
	}
	const injected = deferredOnces(scenario, plan, calendar).flatMap((item) => {
		const fire = fires.get(item.milestone)
		if (fire === undefined) return []
		return onceEventsOn([item], [item.milestone], fire, scenario.economy.inflation)
	})
	return [...events, ...injected].filter((event) => landsAt(fires, event.flow, event.date))
}
