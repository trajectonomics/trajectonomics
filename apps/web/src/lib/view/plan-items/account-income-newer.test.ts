import { describe, expect, test } from "bun:test"
import { scenarioAccount } from "../../contract"
import { accountFromDraft } from "./account-draft"
import type { IncomeContext } from "./account-income"
import { accountDraftOf } from "./accounts"

const CTX: IncomeContext = { taxed: true, milestones: ["retire"], anchors: [] }

/** Words the CLI could state after this page was written: the contract reads them as plain strings. */
const NEWER = {
	compounding: "fortnightly",
	payout: { bps: "3.50", frequency: "weekly", rounding: "banker", startAt: "retire" },
	fee: { bps: "1.50", rounding: "banker" },
}

const fund = () => scenarioAccount.parse({ id: "fund", kind: "asset", rate: 600, ...NEWER })

describe("an Account that states a word the CLI added after this page was written", () => {
	test("opens a draft that holds each word as it is", () => {
		const draft = accountDraftOf(fund(), CTX)
		expect(draft.compounding).toBe("fortnightly")
		expect(draft.payout.frequency).toBe("weekly")
		expect(draft.payout.rounding).toBe("banker")
		expect(draft.fee.rounding).toBe("banker")
	})

	test("saves untouched with each word as it was, for the CLI to judge", () => {
		const account = fund()
		const result = accountFromDraft(accountDraftOf(account, CTX), {
			existing: account,
			taken: ["bank"],
			income: CTX,
		})
		expect(result.ok).toBe(true)
		if (!result.ok) return
		expect(result.account.compounding).toBe("fortnightly")
		expect(result.account.payout).toMatchObject({ frequency: "weekly", rounding: "banker" })
		expect(result.account.fee).toMatchObject({ rounding: "banker" })
	})
})
