import { describe, expect, it } from "bun:test"
import { run, type Setup } from "./test-helpers"

const cash = { id: "cash", kind: "asset", rate: 0 } as const
const home = { id: "home", kind: "asset", rate: 0, liquid: false } as const
const unmarkedHome = { id: "home", kind: "asset", rate: 0 } as const

/** Cash 1,000 and a home 5,000, with no Flows: every row holds the same two balances. */
const plan = {
	accounts: [cash, home],
	balances: { cash: 1000, home: 5000 },
	surplus: [{ account: "cash" }],
	withdraw: ["cash"],
	start: "2026-01-01",
	horizon: "2026-03-01",
	resolution: "month",
} as const satisfies Setup

describe("an illiquid asset stays in net worth and leaves accessible net worth", () => {
	it("counts the home in net worth and leaves it out of accessible net worth", () => {
		// Opening net worth is 1,000 + 5,000 = 6,000; accessible is cash alone, 1,000.
		const [opening] = run(plan).rows
		expect(opening).toMatchObject({
			netWorth: 6000,
			accessibleNetWorth: 1000,
			realNetWorth: 6000,
			realAccessibleNetWorth: 1000,
		})
	})

	it("reports the home in every balance row, never dropped from the list", () => {
		const rows = run(plan).rows
		expect(rows.length).toBeGreaterThan(1)
		for (const row of rows) {
			expect(row.balances).toEqual([
				{ account: "cash", amount: 1000, capitalised: 1000, accruedInterest: 0 },
				{ account: "home", amount: 5000, capitalised: 5000, accruedInterest: 0 },
			])
		}
	})

	it("counts the same home in accessible net worth once it is not marked", () => {
		const unmarked = run({ ...plan, accounts: [cash, unmarkedHome] })
		expect(unmarked.rows[0]).toMatchObject({ netWorth: 6000, accessibleNetWorth: 6000 })
	})
})
