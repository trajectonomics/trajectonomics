import type { ReturnModel, Scenario } from "@trajectonomics/core/sim"
import { FIXTURE_ACCOUNTS } from "./ledger-fixture"
import { PROJECTION_SCENARIO, seededHome } from "./projection/testing"
import { applyScenario } from "./scenario-test-support"

/*
 * The plan the `projection chance` spending tests and the help examples share (cli ADR-0063): the
 * fixture plan with a spending rule over the bank and investment Accounts.
 */

const BANK = FIXTURE_ACCOUNTS.bank
const INVESTMENT = FIXTURE_ACCOUNTS.investment

/**
 * The fixture plan plus a `currentRate` rule at 4% of the bank and investment Accounts with a floor
 * of 10,000.00 THB a year, from 2026-04-01. With `rate` 0 on both Accounts the portfolio moves only by
 * what the plan puts in, so a Return model that returns nothing makes every Market path the same run.
 */
export function chanceRulePlan(rate: number | undefined): Scenario {
	return {
		...PROJECTION_SCENARIO,
		accounts: PROJECTION_SCENARIO.accounts.map((account) =>
			rate !== undefined && (account.id === BANK || account.id === INVESTMENT)
				? { ...account, rate }
				: account,
		),
		flows: [
			...PROJECTION_SCENARIO.flows,
			{
				id: "spending",
				kind: "expense",
				frequency: "monthly",
				start: "2026-04-01",
				rule: {
					kind: "currentRate",
					portfolio: [BANK, INVESTMENT],
					rateBps: 400,
					rounding: "floor",
					floor: { amount: 1_000_000, growth: "inflation" },
				},
			},
		],
	}
}

/** A Return model whose one bucket returns nothing, so every Market path is the plan's own run. */
export const ZERO_RETURN_MODEL: ReturnModel = {
	id: "zero",
	accounts: [BANK, INVESTMENT],
	buckets: [{ returnsBps: [0, 0], weight: 4_294_967_296 }],
}

/** The fixture Ledger with `chanceRulePlan(rate)` stored as `ruled`. */
export async function ruledHome(rate: number | undefined): Promise<string> {
	const home = seededHome()
	const applied = await applyScenario(home, "ruled", chanceRulePlan(rate))
	if (applied.code !== 0) throw new Error(applied.err)
	return home
}
