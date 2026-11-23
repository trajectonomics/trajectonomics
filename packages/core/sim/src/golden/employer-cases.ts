import { derivedEmployerShare, employerShare, shareOf } from "../engine/test-employer"
import { contribution, expense, income } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import type { Fixture } from "../fixtures/fixture"
import type { Flow } from "../types"
import type { ParityCase } from "./parity-cases"

const monthly = { frequency: "monthly", start: "2026-01-01" } as const
const ends = { frequency: "monthly", start: "2026-01-31" } as const

/**
 * One hand-worked year of a salaried member of a provident fund. Salary 5,000,000.00 a month, living
 * 4,000,000.00, the member's own 200,000.00 into `pvd`, and the employer's 5% of the salary's gross,
 * 250,000.00, into the same fund. 800,000.00 is left for cash each month.
 */
export const employerYear: Fixture = makeFixture({
	accounts: [
		{ id: "cash", kind: "asset", rate: 0 },
		{ id: "pvd", kind: "asset", rate: 0 },
	],
	balances: { cash: 0, pvd: 0 },
	flows: [
		income("salary", 500_000_000, ends),
		expense("living", 400_000_000, ends),
		contribution("pvd-member", "pvd", 20_000_000, ends),
		derivedEmployerShare("pvd-employer", "pvd", shareOf("salary", 5, 100), ends),
	],
	surplus: [{ account: "cash" }],
	contribute: ["pvd"],
	withdraw: ["cash"],
	start: "2026-01-01",
	horizon: "2026-12-31",
	resolution: "day",
})

/** The pieces of an FI plan that differ: cash 5,000,000, a fund `pvd` that is empty, and the given Flows. */
export function employerPlan(flows: readonly Flow[]): Fixture {
	return makeFixture({
		accounts: [
			{ id: "cash", kind: "asset", rate: 0 },
			{ id: "pvd", kind: "asset", rate: 0 },
		],
		balances: { cash: 5_000_000, pvd: 0 },
		flows,
		surplus: [{ account: "cash" }],
		withdraw: ["cash", "pvd"],
		start: "2026-01-01",
		horizon: "2034-01-01",
		resolution: "month",
	})
}

/** Salary 1,000,000 and rent 300,000 come in, living 600,000 goes out: +700,000 a month, −300,000 once the salary stops. */
export const livingFlows: readonly Flow[] = [
	income("salary", 1_000_000, monthly),
	income("rent", 300_000, { ...monthly, earned: false }),
	expense("living", 600_000, monthly),
]

/** The employer adds 200,000 a month, fixed, or 20% of the salary's gross; both stop with the salary. */
export const fixedShare: Flow = employerShare("pvd-employer", "pvd", 200_000, monthly)
export const derivedShare: Flow = derivedEmployerShare(
	"pvd-employer",
	"pvd",
	shareOf("salary", 1, 5),
	monthly,
)

export const EMPLOYER_PARITY_CASES: readonly ParityCase[] = [
	{ name: "employer-year", fixture: employerYear, projectOptions: { cashflowBreakdown: true } },
	{
		name: "employer-fi",
		fixture: employerPlan([...livingFlows, fixedShare]),
		options: { method: "survival", minBufferMonths: 6 },
	},
]
