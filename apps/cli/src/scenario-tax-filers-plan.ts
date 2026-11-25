import { SIM_SCENARIO } from "./baseline/fixture"
import { FIXTURE_ACCOUNTS } from "./ledger-fixture"
import type { Household } from "./scenario/household/model"

/*
 * A couple's plan for the tests of the joint Return (cli ADR-0075): two salaries and a
 * provident fund Contribution, with a household that names whose each one is.
 */

const HOLDER = { id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 } as const
const PARTNER = { id: "partner", role: "partner", born: "1992-02", lifeExpectancy: 90 } as const

/** One income Flow of a year's pay, in satang. */
function pay(id: string, satang: number): Record<string, unknown> {
	return {
		id,
		kind: "income",
		earned: true,
		amount: satang,
		frequency: "annual",
		start: "2026-01-01",
		end: "2026-12-31",
		growth: { bps: 0 },
	}
}

/** The Account of the fixture Ledger that pays interest, which the plan must declare to be projected. */
export const SAVINGS: string = FIXTURE_ACCOUNTS.bank

/** Salaries of 1,000,000 and 500,000 baht, the hand-checked case (cli ADR-0075). */
export const TWO_SALARIES: Record<string, unknown> = {
	schemaVersion: 4,
	currency: "THB",
	economy: { inflation: 0 },
	accounts: SIM_SCENARIO.accounts,
	flows: [pay("salary", 100_000_000), pay("partner-salary", 50_000_000)],
	cashflow: SIM_SCENARIO.cashflow,
}

/** The two salaries and a provident fund Contribution, none labelled yet. */
export const COUPLE_PLAN: Record<string, unknown> = {
	...TWO_SALARIES,
	flows: [
		pay("salary", 100_000_000),
		pay("partner-salary", 50_000_000),
		{
			id: "pvd",
			kind: "contribution",
			target: FIXTURE_ACCOUNTS.investment,
			amount: 3_000_000,
			frequency: "annual",
			start: "2026-06-01",
			end: "2026-12-31",
			growth: { bps: 0 },
		},
	],
}

/** The `--label` flags that classify the two salaries and the provident fund. */
export const COUPLE_LABELS: readonly string[] = [
	"--label",
	"salary=income.section40_1",
	"--label",
	"partner-salary=income.section40_1",
	"--label",
	"pvd=allowance.retirement.pvd",
]

/** A household of the holder and the partner, owning what the Owners say. */
export function coupleHousehold(owners: Household["owners"] = TWO_OWNERS): Household {
	return { schemaVersion: 2, people: [HOLDER, PARTNER], anchors: [], owners }
}

/** The holder's salary is the holder's, the partner's is the partner's. */
export const TWO_OWNERS: Household["owners"] = [
	{ path: "flows.salary", person: "me" },
	{ path: "flows.partner-salary", person: "partner" },
]

/** The two salaries and the interest, the provident fund and the savings Account owned. */
export const COUPLE_OWNERS: Household["owners"] = [
	...TWO_OWNERS,
	{ path: "flows.pvd", person: "partner" },
	{ path: `accounts.${SAVINGS}`, person: "shared" },
]
