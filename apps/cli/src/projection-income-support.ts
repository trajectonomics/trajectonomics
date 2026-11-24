import type { Scenario } from "@trajectonomics/core/sim"
import type { CashflowRow } from "./projection/cashflow-view"
import type { ProjectionRunView } from "./projection/run-view"
import { tableOf } from "./projection-run-support"
import { applyScenario, scenario } from "./scenario-test-support"
import { ledgerHome } from "./store/testing"

/*
 * The fixtures and readers the tests of an Account's payout and fee and of an employer's share share
 * (cli ADR-0067): a plan on an empty Ledger with a 100,000.00 THB salary, a 5% employer share of it paid
 * into a provident fund, and a fund that pays out 4% a year each quarter, with a 10% prepayment under the
 * Thai Levy, and charges 1.5% a year. Every rate is a stated test value.
 */

/** The plan before it has a Levy: a payout with no label, and an employer share with none. */
export const INCOME_PLAN: Scenario = {
	schemaVersion: 4,
	currency: "THB",
	economy: { inflation: 0 },
	accounts: [
		{ id: "cash", kind: "asset", rate: 0 },
		{ id: "provident", kind: "asset", rate: 300 },
		{
			id: "fund",
			kind: "asset",
			rate: 600,
			payout: { bps: 400, frequency: "quarterly", rounding: "floor" },
			fee: { bps: 150, rounding: "halfUp" },
		},
	],
	flows: [
		{
			id: "salary",
			kind: "income",
			earned: true,
			amount: 10_000_000,
			frequency: "monthly",
			start: "2026-01-01",
			growth: { bps: 0 },
		},
		{
			id: "seed",
			kind: "contribution",
			target: "fund",
			amount: 10_000_000,
			frequency: "once",
			start: "2026-01-01",
			growth: { bps: 0 },
		},
		{
			id: "match",
			kind: "contribution",
			target: "provident",
			funding: "employer",
			frequency: "monthly",
			start: "2026-01-01",
			derive: {
				measures: [
					{ id: "pay", op: "flow", flow: "salary" },
					{ id: "share", op: "scale", of: "pay", num: 5, den: 100, rounding: "floor" },
				],
				result: "share",
			},
		},
	],
	cashflow: { surplus: [{ account: "cash" }], contribute: ["fund"], withdraw: ["cash"] },
}

/** One year, run from the plan's first day. */
export const INCOME_FLAGS: readonly string[] = [
	"--scenario",
	"plan",
	"--as-of",
	"2026-01-01",
	"--horizon",
	"2027-01-01",
]

/** An empty Ledger with `document` stored as `plan`. */
export async function planHome(document: unknown = INCOME_PLAN): Promise<string> {
	const home = ledgerHome()
	const applied = await applyScenario(home, "plan", document)
	if (applied.code !== 0) throw new Error(applied.err)
	return home
}

/**
 * An empty Ledger with the plan taxed under the Thai Levy, as `scenario tax` writes it, and then the
 * payout labelled as dividends with 10% taken at source, which the Levy it wrote reads.
 */
export async function taxedHome(): Promise<string> {
	const home = await planHome()
	const taxed = await scenario(home, [
		"tax",
		"plan",
		"--tax",
		"th-2026",
		"--label",
		"salary=income.section40_1",
	])
	if (taxed.code !== 0) throw new Error(taxed.err)
	const shown = JSON.parse((await scenario(home, ["show", "plan"])).out) as {
		scenario: { document: { accounts: { id: string; payout?: object }[] } }
	}
	const document = shown.scenario.document
	for (const account of document.accounts) {
		if (account.id === "fund") {
			account.payout = {
				...account.payout,
				label: "income.section40_4.dividends",
				prepayments: [{ levy: "th-2026-pit", bps: 1000 }],
			}
		}
	}
	const applied = await applyScenario(home, "plan", document)
	if (applied.code !== 0) throw new Error(applied.err)
	return home
}

/** The exact sum, in satang, of decimal money strings. */
export function satang(amounts: readonly string[]): bigint {
	return amounts.reduce((sum, text) => sum + BigInt(text.replace(".", "")), 0n)
}

/** The cash-flow lines of one roll-up and group. */
export function linesOf(body: ProjectionRunView, index: number, group: string): CashflowRow[] {
	return tableOf(body, "cashflow").rows.filter((row) => row.index === index && row.group === group)
}
