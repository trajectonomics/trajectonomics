import { describe, expect, test } from "bun:test"
import { accountFromDraft } from "./account-draft"
import { accountCards, accountDraftOf } from "./accounts"
import { baselineRead, planDocument } from "./fixtures.test-support"

describe("accountCards", () => {
	test("shows each Account's rate as a percent, its lock, its compounding, and the Baseline balance", () => {
		const cards = accountCards(planDocument().accounts, baselineRead())
		expect(cards[0]).toEqual({
			id: "bank",
			kind: "asset",
			rate: "1.00%",
			compounding: null,
			lockedUntil: "2030-01-01",
			balance: "662300.00",
		})
		expect(cards[1]).toEqual({
			id: "loan",
			kind: "liability",
			rate: "5.00%",
			compounding: "monthly",
			lockedUntil: null,
			balance: null,
		})
	})

	test("an Account has no balance when the Baseline has none, or when its read failed", () => {
		const accounts = planDocument().accounts
		expect(accountCards(accounts, undefined).map((card) => card.balance)).toEqual([null, null])
		const failed = {
			argv: ["baseline", "show"],
			ok: false as const,
			error: { code: "x", exitCode: 1, message: "m" },
		}
		expect(accountCards(accounts, failed).map((card) => card.balance)).toEqual([null, null])
	})
})

describe("saving an Account", () => {
	test("gives back the stored Account, field for field, when nothing changed", () => {
		for (const account of planDocument().accounts) {
			expect(accountFromDraft(accountDraftOf(account), { existing: account, taken: [] })).toEqual({
				ok: true,
				account,
			})
		}
	})

	test("a new Account is an asset whose id is its name, with its rate in basis points", () => {
		const result = accountFromDraft(
			{ ...accountDraftOf(), name: "Emergency fund", rate: "2.5", lockedUntil: "2031-06-30" },
			{ taken: ["bank"] },
		)
		expect(result).toEqual({
			ok: true,
			account: { id: "emergency-fund", kind: "asset", rate: 250, lockedUntil: "2031-06-30" },
		})
	})

	test("a debt drops its lock, and an empty compounding is left out", () => {
		const debt = planDocument().accounts[1]
		const result = accountFromDraft(
			{ ...accountDraftOf(debt), kind: "liability", lockedUntil: "2031-06-30" },
			{ existing: debt, taken: [] },
		)
		expect(result).toEqual({
			ok: true,
			account: { id: "loan", kind: "liability", rate: 500, compounding: "monthly" },
		})
	})

	test("refuses a rate with three places and a lock that is not a date, at their fields", () => {
		const result = accountFromDraft(
			{ ...accountDraftOf(), name: "Fund", rate: "3.005", lockedUntil: "soon" },
			{ taken: [] },
		)
		expect(result.ok).toBe(false)
		if (result.ok) return
		expect(Object.keys(result.problems).sort()).toEqual(["lockedUntil", "rate"])
	})
})
