import { expense } from "../engine/test-flows"
import { makeFixture } from "../engine/test-helpers"
import type { Fixture } from "../fixtures/fixture"
import type { Account, PlanReturnModelResult, ReturnModel, Scenario } from "../types"
import { planReturnModel } from "./plan-model"

/** A Scenario with the given Accounts, for building a plan Return model. */
export function planScenario(accounts: readonly Account[]): Scenario {
	return makeFixture({ accounts, balances: {}, surplus: [] }).scenario
}

/** A one-year plan over the given Accounts, holding 100,000 in each asset. */
export function planFixture(accounts: readonly Account[]): Fixture {
	const balances = Object.fromEntries(
		accounts
			.filter((account) => account.kind === "asset")
			.map((account) => [account.id, 10_000_000]),
	)
	return makeFixture({
		accounts,
		balances,
		flows: [expense("living", 150_000, { frequency: "monthly" })],
		surplus: [{ account: accounts[0]!.id }],
		withdraw: [accounts[0]!.id, accounts[1]!.id],
		horizon: "2027-01-01",
		resolution: "month",
	})
}

/** The built model, or a thrown failure so a test reads straight on. */
export function builtModel(accounts: readonly Account[], buckets: number): ReturnModel {
	const result: PlanReturnModelResult = planReturnModel(planScenario(accounts), { buckets })
	if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.problems)}`)
	return result.model
}
