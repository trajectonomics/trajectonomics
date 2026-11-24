import { expense, income } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import type { Fixture } from "../fixtures/fixture"
import type { Account } from "../types"

const cash: Account = { id: "cash", kind: "asset", rate: 0 }
const invest: Account = { id: "invest", kind: "asset", rate: 0 }
const emergency: Account = { id: "emergency", kind: "asset", rate: 0 }
const savings: Account = { id: "savings", kind: "asset", rate: 0 }
const funds: Account = { id: "funds", kind: "asset", rate: 0 }
const rmf: Account = { id: "rmf", kind: "asset", rate: 0, lockedUntil: "2027-01-01" }

const TWO_MONTHS = { start: "2026-01-01", horizon: "2026-02-28", resolution: "day" } as const

/**
 * 1,000,001 lands on 15 January. A 30 per cent share step takes `floor(1,000,001 × 3000 / 10000)` =
 * 300,000 (the 0.3 is dropped), and the uncapped step after it takes the 700,001 that is left.
 */
export const shareThenRest: Fixture = makeFixture({
	accounts: [cash, invest],
	balances: {},
	flows: [income("pay", 1_000_001, { start: "2026-01-15" })],
	surplus: [{ account: "invest", share: 3000 }, { account: "cash" }],
	withdraw: ["cash"],
	...TWO_MONTHS,
})

/** The same 1,000,000, with the share step capped at 250,000: the 50,000 the cap leaves stays for the rest. */
export const shareCapped: Fixture = makeFixture({
	accounts: [cash, invest],
	balances: {},
	flows: [income("pay", 1_000_000, { start: "2026-01-15" })],
	surplus: [{ account: "invest", share: 3000, upTo: 250_000 }, { account: "cash" }],
	withdraw: ["cash"],
	...TWO_MONTHS,
})

/**
 * The emergency fund of 150,000 is topped up to 200,000 first (50,000, 950,000 left); half of what is left,
 * 475,000, goes to investments, and the uncapped step keeps the other 475,000.
 */
export const topUpThenShare: Fixture = makeFixture({
	accounts: [emergency, invest, cash],
	balances: { emergency: 150_000 },
	flows: [income("pay", 1_000_000, { start: "2026-01-15" })],
	surplus: [
		{ account: "emergency", upTo: 200_000 },
		{ account: "invest", share: 5000 },
		{ account: "cash" },
	],
	withdraw: ["cash"],
	...TWO_MONTHS,
})

/**
 * A 600,000 expense on 1 February against savings 500,000 and funds 200,000. Savings is drawn down to its
 * floor of 300,000 first (200,000), then funds (200,000), then the rest of savings (the last 200,000).
 */
export const floorThenFunds: Fixture = makeFixture({
	accounts: [savings, funds, cash],
	balances: { savings: 500_000, funds: 200_000 },
	flows: [expense("bill", 600_000, { start: "2026-02-01" })],
	surplus: [{ account: "cash" }],
	withdraw: [{ account: "savings", downTo: 300_000 }, "funds", "savings"],
	...TWO_MONTHS,
})

/** The floor is the only entry for savings, so 300,000 stays and 400,000 of the bill is unmet. */
export const floorStopsDraw: Fixture = makeFixture({
	accounts: [savings, cash],
	balances: { savings: 500_000 },
	flows: [expense("bill", 600_000, { start: "2026-02-01" })],
	surplus: [{ account: "cash" }],
	withdraw: [{ account: "savings", downTo: 300_000 }],
	...TWO_MONTHS,
})

/** A locked Account is skipped even with a floor of 0: the draw falls to savings. */
export const lockedFloor: Fixture = makeFixture({
	accounts: [rmf, savings, cash],
	balances: { rmf: 900_000, savings: 500_000 },
	flows: [expense("bill", 100_000, { start: "2026-02-01" })],
	surplus: [{ account: "cash" }],
	withdraw: [{ account: "rmf", downTo: 0 }, "savings"],
	...TWO_MONTHS,
})

/** Five years at 3 per cent inflation: 300,000 keeps its value as 347,782 (`300,000 × 1.03^5` = 347,782.2). */
export const realFloor: Fixture = makeFixture({
	accounts: [savings, cash],
	balances: { savings: 500_000 },
	flows: [expense("bill", 200_000, { start: "2031-02-01" })],
	surplus: [{ account: "cash" }],
	withdraw: [{ account: "savings", downTo: { amount: 300_000, growth: "inflation" } }],
	inflation: 300,
	start: "2026-01-01",
	horizon: "2031-03-01",
	resolution: "month",
})

/** Five years at 3 per cent: a fund of 1,000,000 kept in today's money is topped up to 1,159,274 (`1.03^5` = 1.1592740743). */
export const realTarget: Fixture = makeFixture({
	accounts: [emergency, cash],
	balances: {},
	flows: [income("pay", 2_000_000, { start: "2031-02-01" })],
	surplus: [
		{ account: "emergency", upTo: { amount: 1_000_000, growth: "inflation" } },
		{ account: "cash" },
	],
	withdraw: ["cash"],
	inflation: 300,
	start: "2026-01-01",
	horizon: "2031-03-01",
	resolution: "month",
})
