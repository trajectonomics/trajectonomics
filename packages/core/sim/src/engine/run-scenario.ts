import type { Inflation, PricePath } from "../money/inflation"
import type { Scenario } from "../types"
import type { Returns } from "./returns"

/** A Scenario as one run reads it: the declared one, with its run's Price path when it has one. */
export interface RunScenario extends Scenario {
	readonly prices?: PricePath
}

/** The inflation one run follows: the Scenario's one rate, or the Price path of its Market path. */
export function inflationOf(scenario: RunScenario): Inflation {
	return scenario.prices ?? scenario.economy.inflation
}

/** The Scenario one run of `returns` reads: `scenario` itself unless it brings a new Price path. */
export function runScenarioOf(scenario: RunScenario, returns: Returns | undefined): RunScenario {
	const prices = returns?.prices
	if (prices === undefined || prices === scenario.prices) return scenario
	return { ...scenario, prices }
}
