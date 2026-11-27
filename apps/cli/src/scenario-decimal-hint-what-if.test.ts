import { describe, expect, it } from "bun:test"
import { applyScenario, errorOf, scenario, scenarioHome } from "./scenario-test-support"
import { apply } from "./scenario-what-if-support"
import { SCENARIO_DOCUMENT } from "./store/testing"

/** The sentence a minor-unit apply adds when a money field holds the decimal form (issue #227). */
const DECIMAL_HINT = "This looks like the decimal form: add --decimal."

/** The hint a what-if's refusal carries when no worded code or decimal amount adds one. */
function ownHint(path: string): string {
	return `The overrides leave ${path} invalid; change that value or the path.`
}

/** A home holding the shared plan, so every what-if has something to apply to. */
async function seeded(): Promise<string> {
	const home = scenarioHome()
	await applyScenario(home, "base", SCENARIO_DOCUMENT)
	return home
}

describe("the --decimal hint on the what-if forms", () => {
	it("names --decimal for a money --set, and carries none for a rate in basis points", async () => {
		const home = await seeded()
		const money = await apply(home, ["base", "--set", 'flows.salary.amount="-0.50"'])
		expect(money.code).toBe(2)
		expect(errorOf(money)).toMatchObject({
			code: "invalid_input",
			path: "--set",
			hint: `${DECIMAL_HINT} ${ownHint("document.flows.0.amount")}`,
			details: {
				index: 0,
				path: "flows.salary.amount",
				documentPath: "document.flows.0.amount",
				code: "NOT_SAFE_INTEGER",
			},
		})
		const rate = await apply(home, ["base", "--set", 'accounts.cash.rate="1.50"'])
		expect(rate.code).toBe(2)
		expect(errorOf(rate).code).toBe("invalid_input")
		expect(errorOf(rate).hint).toBe(ownHint("document.accounts.0.rate"))
	})

	it("names --decimal for a decimal amount in --add", async () => {
		const home = await seeded()
		const item = {
			id: "extra",
			kind: "expense",
			amount: "1000.50",
			frequency: "monthly",
			start: "2026-01-01",
			growth: { bps: 0 },
		}
		const res = await apply(home, ["base", "--add", `flows=${JSON.stringify(item)}`])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			path: "--add",
			hint: `${DECIMAL_HINT} ${ownHint("document.flows.2.amount")}`,
			details: { path: "flows.extra", code: "NOT_SAFE_INTEGER" },
		})
	})

	it("names --decimal for a decimal amount in a fork --set", async () => {
		const home = await seeded()
		const res = await scenario(home, [
			"fork",
			"base",
			"early",
			"--set",
			'flows.salary.amount="9000.500"',
		])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			path: "--set",
			hint: `${DECIMAL_HINT} ${ownHint("document.flows.0.amount")}`,
			details: { path: "flows.salary.amount", code: "NOT_SAFE_INTEGER" },
		})
	})

	it("names --decimal when a percent field is refused before the money field", async () => {
		const home = await seeded()
		const fund = { id: "fund", kind: "asset", rate: 0, fee: { bps: "1.50", rounding: "halfUp" } }
		const res = await apply(home, [
			"base",
			"--add",
			`accounts=${JSON.stringify(fund)}`,
			"--set",
			'flows.salary.amount="9000.50"',
		])
		expect(res.code).toBe(2)
		expect(errorOf(res).hint).toContain(DECIMAL_HINT)
	})
})
