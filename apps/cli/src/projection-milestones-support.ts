import type { Milestone, Scenario } from "@trajectonomics/core/sim"
import { SIM_SCENARIO } from "./baseline/fixture"
import { projectionHome } from "./projection/testing"
import { applyScenario } from "./scenario-test-support"
import { type Captured, capture } from "./test-support"

/*
 * The fixture every milestone projection test shares (cli ADR-0049): one milestone that fires on a
 * date inside the horizon, one that no plan of this size reaches, and the fixture Scenario carrying
 * them with its salary gated on the first.
 */

/** A milestone that fires on a date inside the horizon, and one no plan of this size reaches. */
export const MILESTONES: Milestone[] = [
	{ id: "reached", combine: "all", criteria: [{ id: "start", kind: "date", on: "2026-06-30" }] },
	{
		id: "never",
		combine: "all",
		criteria: [
			{
				id: "wealth",
				kind: "metric",
				metric: "netWorth",
				op: "atLeast",
				amount: 1_000_000_000_000_000,
				terms: "nominal",
			},
		],
	},
]

/** The fixture with its salary gated on the reached milestone, so a `--set` has a gate to replace. */
export const MILESTONED: Scenario = {
	...SIM_SCENARIO,
	flows: SIM_SCENARIO.flows.map((flow) =>
		flow.id === "salary" ? { ...flow, startAt: "reached" } : flow,
	),
	milestones: MILESTONES,
}

export async function withMilestones(): Promise<string> {
	const home = await projectionHome()
	const applied = await applyScenario(home, "milestoned", MILESTONED)
	if (applied.code !== 0) throw new Error(applied.err)
	return home
}

/** Runs `traj projection ...` in the human Format, with no `--json`. */
export function humanRun(home: string, argv: readonly string[]): Promise<Captured> {
	return capture(["projection", ...argv], { TRAJ_HOME: home })
}
