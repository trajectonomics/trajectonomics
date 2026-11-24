import { describe, expect, test } from "bun:test"
import { type ScenarioAccount, scenarioAccount } from "../../contract"
import { accountFromDraft } from "./account-draft"
import type { IncomeContext } from "./account-income"
import { accountDraftOf } from "./accounts"

const CTX: IncomeContext = {
	taxed: true,
	milestones: ["retire"],
	anchors: [{ value: "anchor:flows.salary.end", label: "When salary ends", date: "2050-05-14" }],
}

const fund = (extra: Record<string, unknown> = {}): ScenarioAccount =>
	scenarioAccount.parse({ id: "fund", kind: "asset", rate: 600, ...extra })

const PAYS = {
	payout: {
		bps: "3.50",
		frequency: "quarterly",
		rounding: "floor",
		startAt: "retire",
		label: "income.section40_4.dividends",
	},
	fee: { bps: "1.50", rounding: "halfUp" },
}

const save = (draft: ReturnType<typeof accountDraftOf>, existing?: ScenarioAccount, income = CTX) =>
	accountFromDraft(draft, { existing, taken: ["bank"], income })

describe("an Account with no payout and no fee", () => {
	test("opens with both sections empty and nothing chosen, and saves with neither", () => {
		const draft = accountDraftOf(fund(), CTX)
		expect(draft.payout).toEqual({
			rate: "",
			frequency: "",
			rounding: "",
			from: "now",
			milestone: "",
			anchor: "",
			date: "",
			kind: "",
		})
		expect(save(draft, fund())).toEqual({ ok: true, account: fund() })
	})
})
describe("a payout and a fee, as the form writes them", () => {
	test("a payout from a Milestone and a fee are written as the schema takes them, and read back unchanged", () => {
		const account = fund(PAYS)
		const draft = accountDraftOf(account, CTX)
		expect(draft.payout).toMatchObject({
			rate: "3.50",
			frequency: "quarterly",
			from: "milestone",
			milestone: "retire",
			kind: "dividends",
		})
		expect(save(draft, account)).toEqual({ ok: true, account })
	})

	test("a new payout and fee are sent as the percent text typed, with the kind's label under a Levy", () => {
		const draft = {
			...accountDraftOf(undefined, CTX),
			name: "Fund",
			rate: "6",
			payout: {
				rate: "3.5",
				frequency: "semiannual",
				rounding: "ceil",
				from: "date",
				milestone: "",
				anchor: "",
				date: "2030-01-01",
				kind: "interest",
			},
			fee: { rate: "1.5", rounding: "halfUp" },
		}
		const result = save(draft)
		expect(result).toMatchObject({
			ok: true,
			account: {
				id: "fund",
				payout: {
					bps: "3.5",
					frequency: "semiannual",
					rounding: "ceil",
					start: "2030-01-01",
					label: "income.section40_4.interest",
				},
				fee: { bps: "1.5", rounding: "halfUp" },
			},
		})
	})

	test("a household's date is written as the date, other is the general 40(4) label, and an untaxed plan writes no label", () => {
		const draft = {
			...accountDraftOf(fund(), CTX),
			payout: {
				rate: "2",
				frequency: "annual",
				rounding: "floor",
				from: "anchor",
				milestone: "",
				anchor: "anchor:flows.salary.end",
				date: "",
				kind: "other",
			},
		}
		const taxed = save(draft, fund())
		expect(taxed).toMatchObject({
			ok: true,
			account: { payout: { start: "2050-05-14", label: "income.section40_4" } },
		})
		const untaxed = save(draft, fund(), { ...CTX, taxed: false })
		expect(untaxed.ok && untaxed.account.payout).toEqual({
			bps: "2",
			frequency: "annual",
			rounding: "floor",
			start: "2050-05-14",
		})
	})

	test("starting now writes no start, and the payout's end and prepayments are kept", () => {
		const account = fund({
			payout: {
				bps: "3.00",
				frequency: "monthly",
				rounding: "floor",
				end: "2060-01-01",
				prepayments: [{ levy: "pit", bps: 1000 }],
				startAt: "retire",
			},
		})
		const draft = {
			...accountDraftOf(account, CTX),
			payout: { ...accountDraftOf(account, CTX).payout, from: "now" },
		}
		const result = save(draft, account)
		expect(result.ok && result.account.payout).toEqual({
			bps: "3.00",
			frequency: "monthly",
			rounding: "floor",
			end: "2060-01-01",
			prepayments: [{ levy: "pit", bps: 1000 }],
		})
	})

	test("emptying a section takes the payout or the fee out", () => {
		const account = fund(PAYS)
		const draft = accountDraftOf(account, CTX)
		const empty = {
			...draft,
			payout: accountDraftOf(fund(), CTX).payout,
			fee: { rate: "", rounding: "" },
		}
		expect(save(empty, account)).toEqual({ ok: true, account: fund() })
	})
})

describe("what a payout or a fee refuses before traj sees it", () => {
	test("each field with nothing chosen or a bad shape is a problem at its own field, and no rounding is chosen for the person", () => {
		const draft = {
			...accountDraftOf(fund(), CTX),
			payout: {
				rate: "3.505",
				frequency: "",
				rounding: "",
				from: "milestone",
				milestone: "",
				anchor: "",
				date: "",
				kind: "",
			},
			fee: { rate: "abc", rounding: "" },
		}
		const result = save(draft, fund())
		expect(result.ok || Object.keys(result.problems).sort()).toEqual([
			"feeRate",
			"feeRounding",
			"payoutFrequency",
			"payoutRate",
			"payoutRounding",
			"payoutStart",
		])
	})

	test("a date that is not YYYY-MM-DD is a problem at the start, and a fee alone is a fee with its rounding required", () => {
		const draft = {
			...accountDraftOf(fund(), CTX),
			payout: {
				...accountDraftOf(fund(), CTX).payout,
				rate: "3",
				frequency: "annual",
				rounding: "floor",
				from: "date",
				date: "soon",
			},
			fee: { rate: "1", rounding: "" },
		}
		const result = save(draft, fund())
		expect(result.ok || Object.keys(result.problems).sort()).toEqual(["feeRounding", "payoutStart"])
	})
})

describe("an Account that offers neither section", () => {
	test("an illiquid asset keeps a fee held by hand, and a debt drops both", () => {
		const home = fund({ id: "home", liquid: false, fee: { bps: "0.50", rounding: "floor" } })
		expect(save(accountDraftOf(home, CTX), home)).toEqual({ ok: true, account: home })
		const debt = { ...accountDraftOf(fund(PAYS), CTX), kind: "liability" }
		const result = save(debt, fund(PAYS))
		expect(result.ok && result.account).toEqual({ id: "fund", kind: "liability", rate: 600 })
	})
})
