import { SIM_SCENARIO } from "./baseline/fixture"
import { resultOf, scenario } from "./scenario-test-support"
import { type Captured, capture } from "./test-support"

/** A hash no stored plan has; a write that names it is refused over any plan that is stored. */
export const STALE = "jcs1:sha256:0000000000000000000000000000000000000000000000000000000000000000"

/** The fields of a what-if's result a test reads. */
export type Body = {
	dryRun: boolean
	status: "created" | "updated" | "unchanged"
	scenario: { contentHash: string; version: number; document: Record<string, unknown> }
	droppedAnchors: string[]
	notes: string[]
	overrides?: { path: string; value: unknown }[]
	removals?: string[]
}

export function bodyOf(res: Captured): Body {
	return resultOf(res) as Body
}

/** The stored plan's hash, version and row, as `scenario show` prints them. */
export async function stored(
	home: string,
	name = "base",
): Promise<{ contentHash: string; version: number; row: Record<string, unknown> }> {
	const row = resultOf(await scenario(home, ["show", name])).scenario
	return { contentHash: row.contentHash as string, version: row.version as number, row }
}

/** `traj scenario apply ...` in JSON against one data directory. */
export function apply(home: string, argv: readonly string[]): Promise<Captured> {
	return capture(["scenario", "apply", ...argv, "--json"], { TRAJ_HOME: home })
}

/** A Scenario whose derived expense reads the investment Flow, which a removal therefore may not take. */
export function derivedScenario(): Record<string, unknown> {
	return {
		...SIM_SCENARIO,
		flows: [
			...SIM_SCENARIO.flows,
			{
				id: "tenth",
				kind: "expense",
				frequency: "monthly",
				start: "2026-06-30",
				derive: {
					measures: [
						{ id: "pay", op: "flow", flow: "invest" },
						{ id: "tenth", op: "scale", of: "pay", num: 1, den: 10, rounding: "floor" },
					],
					result: "tenth",
				},
			},
		],
	}
}
