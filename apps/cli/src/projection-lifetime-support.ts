import type { Account, Scenario } from "@trajectonomics/core/sim"
import { modelFile } from "./projection-chance-support"
import { INCOME_PLAN, planHome } from "./projection-income-support"

/*
 * The fixture of the lifetime-totals tests on a Market path (cli ADR-0067, ADR-0069): the payout-and-fee plan
 * of cli ADR-0067 and a Return model over its three Accounts, stated test values with a bucket of the fund
 * that is not flat. `declared` false takes the fund's payout and fee away.
 */

/** Four equally weighted market months over the plan's cash, provident fund and fund; weights sum to 2^32. */
const MODEL = {
	id: "lifetime-test",
	accounts: ["cash", "provident", "fund"],
	buckets: [
		{ returnsBps: [0, 20, 90], weight: 1073741824 },
		{ returnsBps: [0, 20, 30], weight: 1073741824 },
		{ returnsBps: [0, 20, -120], weight: 1073741824 },
		{ returnsBps: [0, 20, -300], weight: 1073741824 },
	],
}

/** The plan with the fund's payout and fee as given (`undefined` takes the item away), and nothing else changed. */
export function withFund(item: {
	payout?: object | undefined
	fee?: object | undefined
}): Scenario {
	return {
		...INCOME_PLAN,
		accounts: INCOME_PLAN.accounts.map((account) => {
			if (account.id !== "fund" || account.kind !== "asset") return account
			const { payout: _payout, fee: _fee, ...rest } = account
			return {
				...rest,
				...(item.payout === undefined ? {} : { payout: item.payout }),
				...(item.fee === undefined ? {} : { fee: item.fee }),
			} as Account
		}),
	}
}

/** A data directory with the plan stored as `plan` and the Return model's file beside it. */
export async function projectionLifetimeHome(
	declared: boolean,
): Promise<{ home: string; model: string }> {
	const home = await planHome(declared ? INCOME_PLAN : withFund({}))
	return { home, model: modelFile(home, MODEL) }
}
