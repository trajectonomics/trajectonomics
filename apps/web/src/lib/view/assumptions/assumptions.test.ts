import { describe, expect, test } from "bun:test"
import { type ScenarioDocument, scenarioDocument } from "../../contract"
import { documentFromDraft } from "./build"
import { chosenOf, fillWith, SWING_CHOICES } from "./choices"
import { draftOf, fieldKey } from "./draft"

/** A plan with a bank, a fund, a home that cannot be sold at once, and a loan. Nothing states a volatility or an inflation. */
function plan(over: Record<string, unknown> = {}): ScenarioDocument {
	return scenarioDocument.parse({
		currency: "THB",
		flows: [],
		accounts: [
			{ id: "bank", kind: "asset", rate: 150 },
			{ id: "fund", kind: "asset", rate: 500, compounding: "monthly" },
			{ id: "home", kind: "asset", rate: 200, liquid: false, volatility: 900 },
			{ id: "loan", kind: "liability", rate: 600 },
		],
		...over,
	})
}

function saved(doc: ScenarioDocument, change: (draft: ReturnType<typeof draftOf>) => void) {
	const draft = draftOf(doc)
	change(draft)
	const result = documentFromDraft(doc, draft)
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return result.document
}

describe("the rows", () => {
	test("one per asset Account, in the document's order: a liability has no row, an illiquid asset shows its return only", () => {
		const rows = draftOf(plan()).accounts
		expect(rows.map((row) => [row.id, row.swings])).toEqual([
			["bank", true],
			["fund", true],
			["home", false],
		])
	})

	test("nothing is made up: an inflation or a volatility the plan does not state is empty", () => {
		const draft = draftOf(plan())
		expect(draft.inflation).toBe("")
		expect(draft.accounts.map((row) => row.volatility)).toEqual(["", "", "9.00"])
		expect(draft.accounts.map((row) => row.rate)).toEqual(["1.50", "5.00", "2.00"])
		expect(draftOf(plan({ economy: { inflation: 300 } })).inflation).toBe("3.00")
	})

	test("an empty volatility is none: no key is written, and a stored one is taken out", () => {
		const doc = plan({ accounts: [{ id: "fund", kind: "asset", rate: 500, volatility: 1500 }] })
		const next = saved(doc, (draft) => {
			const row = draft.accounts[0]
			if (row) row.volatility = ""
		})
		expect("volatility" in (next.accounts[0] ?? {})).toBe(false)
		const untouched = saved(plan(), () => {})
		expect(untouched.accounts.some((a) => a.id === "bank" && "volatility" in a)).toBe(false)
	})
})

describe("what the page states", () => {
	test("each text is moved to basis points by its decimal point, and every other field is kept", () => {
		const doc = plan()
		const next = saved(doc, (draft) => {
			draft.inflation = "3.5"
			const [bank, fund] = draft.accounts
			if (bank) bank.rate = "4"
			if (fund) fund.volatility = "15"
		})
		expect(next.economy).toEqual({ inflation: 350 })
		expect(next.accounts[0]).toMatchObject({ id: "bank", rate: 400 })
		expect(next.accounts[1]).toMatchObject({
			id: "fund",
			rate: 500,
			volatility: 1500,
			compounding: "monthly",
		})
		expect(next.accounts[2]).toEqual(doc.accounts[2])
		expect(next.accounts[3]).toEqual(doc.accounts[3])
	})

	test("an illiquid asset's stored volatility is kept as it was, and a liability is untouched", () => {
		const next = saved(plan(), (draft) => {
			const home = draft.accounts[2]
			if (home) home.rate = "2.50"
		})
		expect(next.accounts[2]).toMatchObject({ rate: 250, volatility: 900 })
	})

	test("an inflation left empty takes the economy block out", () => {
		const doc = plan({ economy: { inflation: 300 } })
		const next = saved(doc, (draft) => {
			draft.inflation = ""
		})
		expect("economy" in next).toBe(false)
	})

	test("a value that is not a percent with at most two places is a problem at its own field", () => {
		const doc = plan()
		const draft = draftOf(doc)
		draft.inflation = "three"
		const [bank, fund] = draft.accounts
		if (bank) bank.rate = "1.234"
		if (fund) fund.volatility = "a lot"
		const result = documentFromDraft(doc, draft)
		expect(result.ok).toBe(false)
		if (!result.ok) {
			expect(Object.keys(result.problems).sort()).toEqual(
				["inflation", fieldKey("rate", "bank"), fieldKey("volatility", "fund")].sort(),
			)
		}
	})
})

describe("the three choices", () => {
	test("run from the least swing to the most, each a percent the field takes", () => {
		expect(SWING_CHOICES.map((choice) => choice.id)).toEqual(["steady", "moderate", "large"])
		const swings = SWING_CHOICES.map((choice) => Number(fillWith(choice)))
		expect(swings).toEqual([...swings].sort((a, b) => a - b))
		expect(new Set(swings).size).toBe(3)
	})

	test("only fill text: the draft is the text, and the person's own text replaces it", () => {
		const doc = plan()
		const draft = draftOf(doc)
		const fund = draft.accounts[1]
		const large = SWING_CHOICES[2]
		if (fund === undefined || large === undefined) throw new Error("rows and choices")
		const before = JSON.stringify(doc)
		fund.volatility = fillWith(large)
		expect(typeof fund.volatility).toBe("string")
		expect(chosenOf(fund.volatility)).toBe("large")
		fund.volatility = "17.5"
		expect(chosenOf(fund.volatility)).toBeNull()
		expect(JSON.stringify(doc)).toBe(before)
		const result = documentFromDraft(doc, draft)
		expect(result.ok && result.document.accounts[1]).toMatchObject({ volatility: 1750 })
	})

	test("name a kind of holding each, and state no advice", () => {
		expect(SWING_CHOICES.map((choice) => choice.example)).toEqual([
			"such as deposits",
			"such as mixed funds",
			"such as shares",
		])
	})
})

describe("the fee column (the Account form's fee, web ADR 0017)", () => {
	const funded = () =>
		plan({
			accounts: [
				{ id: "fund", kind: "asset", rate: 500, fee: { bps: "1.50", rounding: "floor" } },
				{
					id: "home",
					kind: "asset",
					rate: 200,
					liquid: false,
					fee: { bps: "0.50", rounding: "ceil" },
				},
			],
		})

	test("shows the stored fee as the form does, and none as empty", () => {
		expect(draftOf(funded()).accounts[0]?.fee).toEqual({ rate: "1.50", rounding: "floor" })
		expect(draftOf(plan()).accounts[0]?.fee).toEqual({ rate: "", rounding: "" })
	})

	test("a fee is stated, changed and taken out as the Account form does; an illiquid asset keeps its own", () => {
		const doc = funded()
		const next = saved(doc, (draft) => {
			const fund = draft.accounts[0]
			if (fund) fund.fee = { rate: "2", rounding: "halfUp" }
		})
		expect(next.accounts[0]?.fee).toEqual({ bps: "2", rounding: "halfUp" })
		expect(next.accounts[1]).toEqual(doc.accounts[1])
		const none = saved(doc, (draft) => {
			const fund = draft.accounts[0]
			if (fund) fund.fee = { rate: "", rounding: "" }
		})
		expect("fee" in (none.accounts[0] ?? {})).toBe(false)
	})

	test("a share without a rounding is a problem at the row's fee field", () => {
		const doc = plan()
		const draft = draftOf(doc)
		const bank = draft.accounts[0]
		if (bank) bank.fee = { rate: "1.5", rounding: "" }
		const result = documentFromDraft(doc, draft)
		expect(!result.ok && Object.keys(result.problems)).toEqual([fieldKey("feeRounding", "bank")])
	})
})
