import { BoundedCache } from "../bounded-cache"
import type { ResolvedCalendar } from "../calendar/business"
import { planMilestones } from "../milestone/spec"
import type { Baseline, DateString, Scenario, Timeline } from "../types"
import type { FinancialIndependenceOptions } from "../types/financial-independence"
import { retirementWindow, windowThrough } from "./expenses"
import { originalSource } from "./original-window"
import { type ReferencePlan, referencePlan } from "./reference-plan"
import { type RequirementTable, requirementTable } from "./required"

/** The Minimum buffer table and the rule-of-thumb plan of one set of fire dates. */
export interface Windows {
	readonly requirement: RequirementTable
	readonly reference: ReferencePlan
}

type Fires = ReadonlyMap<string, DateString>

/**
 * How a scan gets its windows (ADR 0012). With no dynamic Milestone every candidate shares one
 * `Windows`. With one, a candidate stop can move a fire date, so `shared` is `undefined` and each
 * candidate builds its own from the fire dates of its walk.
 */
export interface WindowPlan {
	/** The Minimum buffer in months. */
	readonly months: number
	readonly shared: Windows | undefined
	readonly forFires: (fires: Fires) => Windows
}

function signature(fires: Fires): string {
	return JSON.stringify([...fires].sort(([left], [right]) => (left < right ? -1 : 1)))
}

/** Builds the scan's windows; the work per distinct set of fire dates is done once. */
export function windowPlan(
	baseline: Baseline,
	scenario: Scenario,
	timeline: Timeline,
	options: FinancialIndependenceOptions,
	firstCandidate: DateString,
	calendar: ResolvedCalendar | undefined,
): WindowPlan {
	const months = options.minBufferMonths ?? 0
	const plan = planMilestones(scenario, calendar)
	const retirement = options.retirementSpending
	const next = originalSource(baseline, scenario, timeline, windowThrough(timeline), calendar)
	const trailing = originalSource(baseline, scenario, timeline, timeline.horizon, calendar)
	const fixed =
		retirement === undefined
			? undefined
			: retirementWindow(timeline, retirement, firstCandidate, scenario.economy.inflation, calendar)
	const reference = options.method === "survival" ? options.reference : undefined
	const build = (fires: Fires): Windows => {
		const expenses = fixed ?? next.windowFor(fires)
		return {
			requirement: requirementTable(expenses, months),
			reference: referencePlan(reference, scenario, timeline, expenses, () =>
				trailing.windowFor(fires),
			),
		}
	}
	const cache = new BoundedCache<string, Windows>(32)
	const forFires = (fires: Fires): Windows => {
		const key = signature(fires)
		const cached = cache.get(key)
		if (cached !== undefined) return cached
		const built = build(fires)
		cache.set(key, built)
		return built
	}
	const shared = plan === undefined || plan.dynamic.length === 0
	return { months, shared: shared ? forFires(plan?.fires ?? new Map()) : undefined, forFires }
}
