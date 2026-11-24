import { income } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import type { Fixture } from "../fixtures/fixture"
import type { Account } from "../types"

const account = (id: string): Account => ({ id, kind: "asset", rate: 0 })

/**
 * A Timeline that starts on 29 February 2028 and ends on 1 March 2031, with 3 per cent inflation, so three
 * anniversaries (28 February 2029, 2030 and 2031) have passed on the horizon. Each target kind appears once:
 * `upTo` of 1,000,000 in today's money is 1,092,727 (`1.03^3` = 1.092727); a floor of 300,000 at -100 bps is
 * 291,090 (`0.99^3` = 0.970299, so 291,089.7 half up); the nominal targets and the plain entry state themselves
 * or null.
 */
export const routingStatement: Fixture = makeFixture({
	accounts: ["emergency", "invest", "cash", "savings", "funds"].map(account),
	balances: { savings: 500_000, funds: 200_000 },
	flows: [income("pay", 500_000, { start: "2028-03-15" })],
	surplus: [
		{ account: "emergency", upTo: { amount: 1_000_000, growth: "inflation" } },
		{ account: "invest", share: 5000, upTo: 250_000 },
		{ account: "cash" },
	],
	withdraw: [
		{ account: "savings", downTo: { amount: 300_000, growth: { bps: -100 } } },
		{ account: "funds", downTo: 50_000 },
		"savings",
	],
	inflation: 300,
	start: "2028-02-29",
	horizon: "2031-03-01",
	resolution: "month",
})
