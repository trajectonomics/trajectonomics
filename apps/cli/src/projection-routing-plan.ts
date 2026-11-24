import type { Scenario } from "@trajectonomics/core/sim"
import { ROUTING_FLOWS, THB } from "./projection-routing-flows"
import { applyScenario } from "./scenario-test-support"
import { ledgerHome } from "./store/testing"

/*
 * The plan the tests of routing and transfers read (cli ADR-0070), on an empty Ledger so every Account starts at
 * zero and every figure is worked by hand, in THB (a figure in satang is that times 100). Every rate is 0 and
 * every number is a stated test value.
 *
 * Each month: salary 100,000, rent 30,000 and 5,000 into the provident fund `pvd`, so 65,000 is left; January also
 * borrows 3,000 on `debt`. The surplus keeps `emergency` at 100,000 in today's money (inflation 3%), puts half of
 * what is then left into `funds` and the rest in `cash`. A repair of 400,000 on 1 October leaves 330,000 to find
 * (the day's 5,000 into `pvd` is not funded), paid out of `emergency` down to 20,000 in today's money, then
 * `funds`, then the rest of `emergency`. `pvd` rolls whole into
 * the locked `rmf` on 1 July, and 1,000 a month moves from `funds` to pay `debt` down from 1 April.
 */

/** The plan with every routing form and two transfers. */
export const ROUTING_PLAN: Scenario = {
	schemaVersion: 4,
	currency: "THB",
	economy: { inflation: 300 },
	accounts: [
		{ id: "cash", kind: "asset", rate: 0 },
		{ id: "emergency", kind: "asset", rate: 0 },
		{ id: "funds", kind: "asset", rate: 0 },
		{ id: "pvd", kind: "asset", rate: 0 },
		{ id: "rmf", kind: "asset", rate: 0, lockedUntil: "2040-01-01" },
		{ id: "debt", kind: "liability", rate: 0 },
	],
	flows: ROUTING_FLOWS,
	cashflow: {
		surplus: [
			{ account: "emergency", upTo: { amount: 100_000 * THB, growth: "inflation" } },
			{ account: "funds", share: 5_000 },
			{ account: "cash" },
		],
		contribute: ["pvd"],
		withdraw: [
			{ account: "emergency", downTo: { amount: 20_000 * THB, growth: "inflation" } },
			"funds",
			"emergency",
		],
	},
}

/** The same plan with no routing form and no transfer, for the byte-identical comparisons. */
export const PLAIN_PLAN: Scenario = {
	...ROUTING_PLAN,
	flows: ROUTING_PLAN.flows.filter((flow) => flow.kind !== "transfer"),
	cashflow: {
		surplus: [{ account: "cash" }],
		contribute: ["pvd"],
		withdraw: ["cash"],
	},
}

/** One year from the plan's first day: the roll-up of 2026, then the first day of 2027. */
export const ROUTING_FLAGS: readonly string[] = [
	"--scenario",
	"plan",
	"--as-of",
	"2026-01-01",
	"--horizon",
	"2027-01-01",
]

/** An empty Ledger with `document` stored as `plan`. */
export async function routingHome(document: unknown = ROUTING_PLAN): Promise<string> {
	const home = ledgerHome()
	const applied = await applyScenario(home, "plan", document)
	if (applied.code !== 0) throw new Error(applied.err)
	return home
}
