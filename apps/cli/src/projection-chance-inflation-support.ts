import type { Scenario } from "@trajectonomics/core/sim"
import { ILLUSTRATIVE_SEED } from "./projection/chance-testing"
import { VOLATILE_PLAN } from "./projection/plan-model-testing"
import { AS_OF, HORIZON, PROJECTION_SCENARIO, projectionHome } from "./projection/testing"
import { applyScenario } from "./scenario-test-support"

/*
 * The plans and flags the inflation-volatility tests share (cli ADR-0085): every rate and spread is
 * the test's own, and the fixture home already stores the base plan.
 */

export const FULL = 4_294_967_296

export const DATES: readonly string[] = ["--as-of", AS_OF, "--horizon", HORIZON]

export function withInflation(economy: {
	inflation: number
	inflationVolatility: number
}): Scenario {
	return { ...PROJECTION_SCENARIO, economy }
}

/** The fixture home, plus a plan that swings only by inflation and one that clamps. */
export async function inflationHome(): Promise<string> {
	const home = await projectionHome()
	const plans = [
		["inflationary", withInflation({ inflation: 250, inflationVolatility: 150 })],
		["clamped", withInflation({ inflation: 9900, inflationVolatility: 1000 })],
		[
			"swinging",
			{
				...VOLATILE_PLAN,
				economy: { inflation: 250, inflationVolatility: 150 },
			},
		],
	] as const
	for (const [name, plan] of plans) {
		const applied = await applyScenario(home, name, plan)
		if (applied.code !== 0) throw new Error(applied.err)
	}
	return home
}

/** `projection chance` over the plan's own model, at 16 buckets, on the fixture's dates. */
export function planFlags(scenario: string, extra: string[] = []): string[] {
	return [
		"chance",
		"--scenario",
		scenario,
		...DATES,
		"--return-model",
		"plan",
		"--paths",
		"20",
		"--seed",
		ILLUSTRATIVE_SEED,
		"--buckets",
		"16",
		...extra,
	]
}
