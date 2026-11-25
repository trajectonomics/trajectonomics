import { expense, income } from "../engine/test-flows"
import type { Setup } from "../engine/test-helpers"
import type { Account } from "../types"

/**
 * Cash 300 and a home 6,000 on 1 Jan 2026. Salary 500 (earned) and living 100 land on each 1st
 * from 1 Jan; surplus fills cash and cash pays withdrawals. Horizon 1 Mar 2026. Minimum buffer:
 * 1 month, so required = ceil(1 × 1,200 / 12) = 100 on every check, since living costs 100 a month.
 */
export function homeSetup(home: Account): Setup {
	return {
		accounts: [{ id: "cash", kind: "asset", rate: 0 }, home],
		balances: { cash: 300, home: 6000 },
		flows: [
			income("salary", 500, { frequency: "monthly", start: "2026-01-01", earned: true }),
			expense("living", 100, { frequency: "monthly", start: "2026-01-01" }),
		],
		surplus: [{ account: "cash" }],
		withdraw: ["cash"],
		start: "2026-01-01",
		horizon: "2026-03-01",
	}
}
