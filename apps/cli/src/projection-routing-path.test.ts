import { describe, expect, it } from "bun:test"
import { FIXTURE_ACCOUNTS } from "./ledger-fixture"
import { ILLUSTRATIVE_SEED } from "./projection/chance-testing"
import { AS_OF, PROJECTION_SCENARIO, projectionHome } from "./projection/testing"
import { pathAt, pathBody } from "./projection-chance-outcomes-support"
import { ROUTED_FIXTURE_PLAN } from "./projection-routing-fixture"
import { applyScenario } from "./scenario-test-support"

/*
 * `projection path` states a grown target's `resolved` as `projection run` does (cli ADR-0070). The fixture's plan has
 * inflation of 2.5% and a Reserve floor of 5,000.00 kept in today's money, which three whole years make 5,384.45: 500,000
 * satang times 1.025 three times is 538,445.3125, rounded half up once.
 */

/** The routed plan with a volatility on the investment Account, so `--return-model plan` has a model to build. */
function volatile(upTo: number): typeof ROUTED_FIXTURE_PLAN {
	const [first, ...rest] = ROUTED_FIXTURE_PLAN.cashflow.surplus
	return {
		...ROUTED_FIXTURE_PLAN,
		accounts: PROJECTION_SCENARIO.accounts.map((account) =>
			account.id === FIXTURE_ACCOUNTS.investment && account.kind === "asset"
				? { ...account, volatility: 1500 }
				: account,
		),
		cashflow: {
			...ROUTED_FIXTURE_PLAN.cashflow,
			surplus: [{ ...first, upTo: { amount: upTo, growth: "inflation" } }, ...rest] as never,
		},
	}
}

async function pathOf(upTo: number) {
	const home = await projectionHome()
	expect((await applyScenario(home, "routed", volatile(upTo))).code).toBe(0)
	const flags = [
		"--scenario",
		"routed",
		"--as-of",
		AS_OF,
		"--horizon",
		"2029-03-31",
		"--return-model",
		"plan",
		"--buckets",
		"64",
		"--paths",
		"50",
		"--seed",
		ILLUSTRATIVE_SEED,
	]
	return { home, res: await pathAt(home, flags, 3) }
}

describe("projection path on a plan with a target that keeps its value", () => {
	it("states the floor's `resolved` at the start and at the horizon", async () => {
		const { res } = await pathOf(1_000_000)
		expect(res.err).toBe("")
		const path = pathBody(res)
		expect(path.routing?.withdraw[0]?.downTo).toEqual({ amount: "5000.00", growth: "inflation" })
		expect(path.routing?.withdraw[0]?.resolved).toEqual({ first: "5000.00", horizon: "5384.45" })
	})

	it("still runs past an `upTo` it cannot state: no `resolved`, and a note names the target", async () => {
		const { res } = await pathOf(9_000_000_000_000_000)
		expect(res.err).toBe("")
		const path = pathBody(res)
		const entries = [...(path.routing?.surplus ?? []), ...(path.routing?.withdraw ?? [])]
		expect(entries.some((entry) => "resolved" in entry)).toBe(false)
		expect(
			path.notes.some((note) => note.startsWith("What the target at cashflow.surplus[0].upTo")),
		).toBe(true)
	})
})
