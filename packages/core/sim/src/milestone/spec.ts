import { landedDate, type ResolvedCalendar } from "../calendar/business"
import type { Criterion, DateString, Flow, Milestone, Scenario } from "../types"
import { analyse } from "./graph"
import type { GraphCriterion } from "./graph-types"
import { staticFire } from "./static"

/** The Milestones of a Scenario with what a run knows before it starts (ADR 0012). */
export interface MilestonePlan {
	/** Scenario order. */
	readonly milestones: readonly Milestone[]
	/** Fire dates of the static Milestones, known before the run. */
	readonly fires: ReadonlyMap<string, DateString>
	/** The dynamic Milestones in evaluation order: dependencies first, ties in Scenario order. */
	readonly dynamic: readonly Milestone[]
}

/** A `once` Flow that waits for a dynamic Milestone, and the Landed date of its own start. */
export interface DeferredOnce {
	readonly flow: Flow
	readonly milestone: string
	readonly landed: DateString
}

function graphCriterion(criterion: Criterion): GraphCriterion {
	if (criterion.kind === "date") return { kind: "date" }
	if (criterion.kind === "milestone") {
		return { kind: "milestone", to: criterion.milestone, months: criterion.months }
	}
	return { kind: "other" }
}

/** The Milestones of a Scenario, or `undefined` when it declares none. */
export function planMilestones(
	scenario: Scenario,
	calendar: ResolvedCalendar | undefined,
): MilestonePlan | undefined {
	const milestones = scenario.milestones
	if (milestones === undefined || milestones.length === 0) return undefined
	const report = analyse(
		milestones.map((milestone) => ({
			id: milestone.id,
			criteria: milestone.criteria.map(graphCriterion),
		})),
	)
	const fires = new Map<string, DateString>()
	const dynamic: Milestone[] = []
	for (const position of report.order) {
		const milestone = milestones[position]!
		if (!report.isStatic[position]) dynamic.push(milestone)
		else {
			const date = staticFire(milestone, fires, calendar)
			if (date !== undefined) fires.set(milestone.id, date)
		}
	}
	return { milestones, fires, dynamic }
}

/**
 * The `once` Flows gated by a static `startAt` whose Landed start falls before the fire date, moved
 * to the fire date. Keyed by Flow id.
 */
export function movedOnceStarts(
	scenario: Scenario,
	calendar: ResolvedCalendar | undefined,
): ReadonlyMap<string, DateString> {
	const moved = new Map<string, DateString>()
	const plan = planMilestones(scenario, calendar)
	if (plan === undefined) return moved
	for (const flow of scenario.flows) {
		if (flow.frequency !== "once" || flow.startAt === undefined) continue
		const fire = plan.fires.get(flow.startAt)
		if (fire !== undefined && landedDate(flow.start, calendar) < fire) moved.set(flow.id, fire)
	}
	return moved
}

/** The `once` Flows whose `startAt` is dynamic: each lands on its fire date when its start passed first. */
export function deferredOnces(
	scenario: Scenario,
	plan: MilestonePlan,
	calendar: ResolvedCalendar | undefined,
): readonly DeferredOnce[] {
	const deferred: DeferredOnce[] = []
	for (const flow of scenario.flows) {
		if (flow.frequency !== "once" || flow.startAt === undefined) continue
		if (plan.fires.has(flow.startAt)) continue
		deferred.push({ flow, milestone: flow.startAt, landed: landedDate(flow.start, calendar) })
	}
	return deferred
}
