import { isSafeInteger, overflow } from "../engine/overflow"
import { routedValue } from "../engine/routed"
import type { ProjectionRouting, RoutedAmount, RoutedResolved, Scenario, Timeline } from "../types"
import type { ProjectionProblem } from "../types/projection"

export interface RoutingOutcome {
	/** The `routing` key of the Projection; absent unless a target is `{ amount, growth }`. */
	readonly fields: { readonly routing?: ProjectionRouting }
	readonly problem: ProjectionProblem | undefined
}

function targets(scenario: Scenario): readonly (RoutedAmount | undefined)[] {
	const { surplus, withdraw } = scenario.cashflow
	return [
		...surplus.map((step) => step.upTo),
		...withdraw.map((entry) => (typeof entry === "string" ? undefined : entry.downTo)),
	]
}

/** Whether any `upTo` or `downTo` keeps its value in today's money, the one case the Projection states routing. */
export function usesGrownTarget(scenario: Scenario): boolean {
	return targets(scenario).some((target) => typeof target === "object")
}

/**
 * The `routing` statement: each step's and entry's target in force on the Timeline start and on the
 * horizon (ADR 0030). A target beyond the safe integers is a VALUE_OVERFLOW on the horizon date.
 */
export function buildRouting(scenario: Scenario, timeline: Timeline): RoutingOutcome {
	if (!usesGrownTarget(scenario)) return { fields: {}, problem: undefined }
	const { start, horizon } = timeline
	const { inflation } = scenario.economy
	let unsafe = false
	const resolve = (target: RoutedAmount | undefined): RoutedResolved | null => {
		if (target === undefined) return null
		const first = routedValue(target, start, start, inflation)
		const last = routedValue(target, start, horizon, inflation)
		if (!isSafeInteger(first) || !isSafeInteger(last)) unsafe = true
		return { first: Number(first), horizon: Number(last) }
	}
	const { surplus, withdraw } = scenario.cashflow
	const routing: ProjectionRouting = {
		surplus: surplus.map((step, entry) => ({ entry, upTo: resolve(step.upTo) })),
		withdraw: withdraw.map((item, entry) => ({
			entry,
			downTo: resolve(typeof item === "string" ? undefined : item.downTo),
		})),
	}
	return unsafe
		? { fields: {}, problem: overflow(horizon) }
		: { fields: { routing }, problem: undefined }
}
