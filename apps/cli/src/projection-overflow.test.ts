import { describe, expect, it } from "bun:test"
import type { Scenario } from "@trajectonomics/core/sim"
import { SIM_SCENARIO } from "./baseline/fixture"
import { FIXTURE_ACCOUNTS } from "./ledger-fixture"
import { OVERFLOW_HINT, overflowSentence } from "./projection/overflow"
import { AS_OF, errorOf, fi, projection, seededHome } from "./projection/testing"
import { applyScenario } from "./scenario-test-support"
import { capture } from "./test-support"

const LIMIT = "9,007,199,254,740,991"

/** One Scenario that overflows for one cause, the date the engine finds it, and its horizon. */
type Cause = { scenario: Scenario; date: string; account: string; horizon: string }

/** An Account rate of 1,000% (100000 bps) instead of 5% (500) on the investment Account. */
const RATE: Cause = {
	scenario: {
		...SIM_SCENARIO,
		accounts: SIM_SCENARIO.accounts.map((account) =>
			account.id === FIXTURE_ACCOUNTS.investment ? { ...account, rate: 100_000 } : account,
		),
	},
	date: "2034-08-31",
	account: FIXTURE_ACCOUNTS.investment,
	horizon: "2060-03-30",
}

/** A Flow whose growth is 5,000% a year (500000 bps), which compounds the salary into the cash. */
const GROWTH: Cause = {
	scenario: {
		...SIM_SCENARIO,
		flows: SIM_SCENARIO.flows.map((flow) =>
			flow.id === "salary" ? { ...flow, growth: { bps: 500_000 } } : flow,
		),
	},
	date: "2031-07-01",
	account: FIXTURE_ACCOUNTS.cash,
	horizon: "2040-03-30",
}

/** A monthly salary of 90 trillion baht: a figure in baht scaled to satang twice. */
const AMOUNT: Cause = {
	scenario: {
		...SIM_SCENARIO,
		flows: SIM_SCENARIO.flows.map((flow) =>
			flow.id === "salary" ? { ...flow, amount: 9_000_000_000_000_000 } : flow,
		),
	},
	date: "2026-05-01",
	account: FIXTURE_ACCOUNTS.cash,
	horizon: "2028-03-30",
}

async function homeWith(scenario: Scenario): Promise<string> {
	const home = seededHome()
	const applied = await applyScenario(home, "big", scenario)
	expect(applied.code).toBe(0)
	return home
}

describe("a projection that overflows", () => {
	for (const [cause, { scenario, date, account, horizon }] of Object.entries({
		"an Account rate far above basis points": RATE,
		"a Flow growth far above basis points": GROWTH,
		"an amount scaled to satang twice": AMOUNT,
	})) {
		it(`says which figure grew too large and why, for ${cause}`, async () => {
			const home = await homeWith(scenario)
			const flags = ["--scenario", "big", "--as-of", AS_OF, "--horizon", horizon]
			for (const res of [await projection(home, ["run", ...flags]), await fi(home, flags)]) {
				expect(res.code).toBe(3)
				const error = errorOf(res)
				expect(error.code).toBe("projection_refused")
				expect(error.exitCode).toBe(3)
				expect(error.message).toContain(`Account ${account} grew past`)
				expect(error.message).toMatch(new RegExp(`${LIMIT} satang\\) on \\d{4}-\\d\\d-\\d\\d\\.$`))
				expect(error.hint).toBe(OVERFLOW_HINT)
				expect(error.details).toHaveLength(1)
				expect(error.details).toMatchObject([{ code: "VALUE_OVERFLOW", account }])
			}
			const run = errorOf(await projection(home, ["run", ...flags]))
			expect(run.message).toContain(`on ${date}.`)
		})
	}

	it("keeps the sentence and the hint in the human form", async () => {
		const home = await homeWith(AMOUNT.scenario)
		const flags = ["--scenario", "big", "--as-of", AS_OF, "--horizon", AMOUNT.horizon]
		const res = await capture(["projection", "run", ...flags], { TRAJ_HOME: home })
		expect(res.code).toBe(3)
		expect(res.err).toContain(`A figure in Account ${AMOUNT.account} grew past the largest amount`)
		expect(res.err).toContain("hint: The usual causes: a rate or growth far above basis points")
		expect(res.err).toContain("  - VALUE_OVERFLOW on 2026-05-01 account")
	})

	it("says a total when the engine names no Account", () => {
		expect(overflowSentence({ date: "2027-01-01" })).toBe(
			`A total the engine computes grew past the largest amount it can hold (${LIMIT} satang) on 2027-01-01.`,
		)
	})

	it("lists VALUE_OVERFLOW with its meaning in the registry", async () => {
		const res = await capture(["schema", "--json"])
		const entry = (
			JSON.parse(res.out) as { errors: { code: string; message: string }[] }
		).errors.find((error) => error.code === "projection_refused")
		expect(entry?.message).toContain("VALUE_OVERFLOW means a figure grew past")
	})
})
