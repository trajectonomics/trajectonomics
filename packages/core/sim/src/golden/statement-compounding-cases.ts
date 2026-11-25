import type { Fixture } from "../fixtures/fixture"
import type { Account, Timeline } from "../types"
import { loanFixture } from "./statement-cases"

const cash: Account = { id: "cash", kind: "asset", rate: 0 }
const YEAR: Timeline = { start: "2025-12-31", horizon: "2026-12-31", resolution: "month" }

/** A 10,000,000 loan at 6% effective annual, with no payments: the rate is not nominal. */
export const effectiveLoan: Fixture = loanFixture([], YEAR, 10_000_000, [
	cash,
	{ id: "loan", kind: "liability", rate: 600 },
])

/** A 10,000,000 loan at 6% nominal, capitalised at the given period's end and nothing paid. */
export function compoundedLoan(compounding: "quarterly" | "semiannual" | "annual"): Fixture {
	return loanFixture([], YEAR, 10_000_000, [
		cash,
		{ id: "loan", kind: "liability", rate: 600, compounding },
	])
}
