import { BoundedCache } from "../bounded-cache"
import type { ResolvedCalendar } from "../calendar/business"
import type { AccountValues } from "../engine/account-values"
import { buildEvents, type DatedEvent } from "../engine/events"
import { planMilestones } from "../milestone/spec"
import type { DateString, Scenario, Timeline } from "../types"
import type { FinancialIndependenceOptions } from "../types/financial-independence"
import { readAccounts } from "./account-reads"
import { retirementWindow, windowThrough } from "./expenses"
import { originalSource } from "./original-window"
import { type ReadDates, readDatesOf } from "./read-dates"
import { type ReferencePlan, referencePlan } from "./reference-plan"
import { type RequirementTable, requirementTable } from "./required"
import { stopsFlow } from "./scan-stop"

/** The Minimum buffer table and the rule-of-thumb plan of one set of fire dates. */
export interface Windows {
	readonly requirement: RequirementTable
	readonly reference: ReferencePlan
}

type Fires = ReadonlyMap<string, DateString>

/** The events a walk continues through after the horizon, and the dates they lie between. */
export interface WindowTail {
	readonly events: readonly DatedEvent[]
	readonly horizon: DateString
	readonly through: DateString
}

/**
 * How a scan gets its windows (ADR 0012, ADR 0020). With no dynamic Milestone and no Derived amount
 * that reads an Account, every candidate shares one `Windows`. Otherwise a candidate stop can move a
 * fire date or an Account's value, so `shared` is `undefined` and each candidate builds its own from
 * the fire dates and the Account values of its walk.
 */
export interface WindowPlan {
	/** The Minimum buffer in months. */
	readonly months: number
	readonly shared: Windows | undefined
	/** The Accounts a Derived amount reads: a walk records each one's value on the dates a window reads. */
	readonly reads: readonly string[]
	/** The dates a window prices a Derived amount on, which a walk records though it lands none there. */
	readonly readDates: ReadDates
	/**
	 * The candidate's events past the horizon through the windows' last date, which its walk
	 * continues through to record the Account values its next-12-months window reads. Empty when
	 * no Account is read, or when retirement spending replaces the planned expenses.
	 */
	readonly tail: WindowTail
	readonly forFires: (fires: Fires, values?: AccountValues) => Windows
}

/** What a window reads when no Account is read, so it reads nothing. */
const NO_VALUES: AccountValues = { at: () => 0n }

function signature(fires: Fires): string {
	return JSON.stringify([...fires].sort(([left], [right]) => (left < right ? -1 : 1)))
}

/** The candidate's events from the horizon through the windows' last date, for a walk to continue through. */
function tailOf(timeline: Timeline, original: readonly DatedEvent[], wanted: boolean): WindowTail {
	const stop = stopsFlow(false)
	const events = wanted
		? original.filter((event) => event.date > timeline.horizon && !stop(event.flow))
		: []
	return { events, horizon: timeline.horizon, through: windowThrough(timeline) }
}

/** Builds the scan's windows; the work per distinct set of fire dates is done once. */
export function windowPlan(
	scenario: Scenario,
	timeline: Timeline,
	options: FinancialIndependenceOptions,
	firstCandidate: DateString,
	calendar: ResolvedCalendar | undefined,
): WindowPlan {
	const months = options.minBufferMonths ?? 0
	const plan = planMilestones(scenario, calendar)
	const retirement = options.retirementSpending
	const reads = readAccounts(scenario)
	const next = originalSource(scenario, timeline, windowThrough(timeline), calendar)
	const trailing = originalSource(scenario, timeline, timeline.horizon, calendar)
	const fixed =
		retirement === undefined
			? undefined
			: retirementWindow(timeline, retirement, firstCandidate, scenario.economy.inflation, calendar)
	const reference = options.method === "survival" ? options.reference : undefined
	const build = (fires: Fires, values: AccountValues): Windows => {
		const expenses = fixed ?? next.windowFor(fires, values)
		return {
			requirement: requirementTable(expenses, months),
			reference: referencePlan(reference, scenario, timeline, expenses, () =>
				trailing.windowFor(fires, values),
			),
		}
	}
	const cache = new BoundedCache<string, Windows>(32)
	const forFires = (fires: Fires, values: AccountValues = NO_VALUES): Windows => {
		if (reads.length > 0) return build(fires, values)
		const key = signature(fires)
		const cached = cache.get(key)
		if (cached !== undefined) return cached
		const built = build(fires, values)
		cache.set(key, built)
		return built
	}
	const shared = reads.length === 0 && (plan === undefined || plan.dynamic.length === 0)
	const original =
		reads.length === 0
			? []
			: buildEvents(scenario, { ...timeline, horizon: windowThrough(timeline) }, calendar)
	const tail = tailOf(timeline, original, reads.length > 0 && retirement === undefined)
	return {
		months,
		shared: shared ? forFires(plan?.fires ?? new Map()) : undefined,
		reads,
		readDates: readDatesOf(original),
		tail,
		forFires,
	}
}
