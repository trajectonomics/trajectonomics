import { describe, expect, test } from "bun:test"
import { scenarioDocument } from "../../contract"
import { assetDocument, realAssetsOf } from "./asset-document"
import { newAssetDraft } from "./asset-draft"
import {
	assetProblemsOf,
	CHECK,
	homeDraft,
	partsOf,
	planWithHome,
} from "./asset-fixtures.test-support"
import { assetFromDraft } from "./asset-from-draft"
import { assetDraftOf } from "./asset-read"
import { dayBefore, monthAfter } from "./date-before"
import { planDocument } from "./fixtures.test-support"

function ids(doc: { flows: { id: string }[]; accounts: { id: string }[] }) {
	return { accounts: doc.accounts.map((a) => a.id), flows: doc.flows.map((f) => f.id) }
}

describe("the ids and items one home form writes", () => {
	const doc = planWithHome()
	const flow = (id: string) => doc.flows.find((item) => item.id === id)

	test("the Account is an illiquid asset whose rate is the value's yearly change", () => {
		expect(doc.accounts.find((a) => a.id === "home")).toMatchObject({
			kind: "asset",
			rate: 300,
			liquid: false,
		})
	})

	test("the ids follow the convention, the loan under `<id>-loan`", () => {
		const before = ids(planDocument())
		const after = ids(doc)
		expect(after.accounts.slice(before.accounts.length)).toEqual(["home", "home-loan"])
		expect(after.flows.slice(before.flows.length)).toEqual([
			"home-purchase",
			"home-buying-cost",
			"home-loan-draw",
			"home-loan-payment",
			"home-running",
			"home-rent",
			"home-sale",
			"home-selling-cost",
			"home-loan-payoff",
		])
	})

	test("the purchase is an obligation, and the loan is drawn on the purchase date", () => {
		expect(flow("home-purchase")).toMatchObject({
			kind: "contribution",
			target: "home",
			funding: "obligation",
			frequency: "once",
			start: "2027-07-15",
			amount: "1500000.00",
		})
		expect(flow("home-loan-draw")).toMatchObject({
			source: "home-loan",
			start: "2027-07-15",
			amount: "1200000.00",
		})
		expect(flow("home-buying-cost")).toMatchObject({
			kind: "expense",
			start: "2027-07-15",
			amount: "20000.00",
		})
	})

	test("running costs are a share of the value, one twelfth of a yearly percent, and end before the sale", () => {
		expect(flow("home-running")).toMatchObject({
			kind: "expense",
			frequency: "monthly",
			start: "2027-08-15",
			end: "2030-07-14",
			category: "housing",
			derive: {
				measures: [
					{ id: "value", op: "account", account: "home" },
					{ id: "share", op: "scale", of: "value", num: 100, den: 120000, rounding: "halfUp" },
				],
				result: "share",
			},
		})
	})

	test("running costs and rent start one month after the purchase, which the engine reads before that day", () => {
		expect(monthAfter("2027-07-15")).toBe("2027-08-15")
		expect(monthAfter("2027-12-31")).toBe("2028-01-31")
		expect(monthAfter("2027-01-31")).toBe("2027-02-28")
		expect(monthAfter("2027-02-30")).toBeNull()
	})

	test("rent is passive income with its stated growth, and ends before the sale", () => {
		expect(flow("home-rent")).toMatchObject({
			kind: "income",
			earned: false,
			amount: "8000.00",
			growth: { bps: 200 },
			start: "2027-08-15",
			end: "2030-07-14",
		})
	})

	test("the sale sells all of it, its loan is repaid from the asset, and its payments end before it", () => {
		expect(flow("home-sale")).toMatchObject({
			kind: "withdrawal",
			source: "home",
			start: "2030-07-15",
			derive: { measures: [{ id: "value", op: "account", account: "home" }], result: "value" },
		})
		expect(flow("home-loan-payoff")).toMatchObject({
			kind: "contribution",
			target: "home-loan",
			frequency: "once",
			start: "2030-07-15",
			derive: { measures: [{ id: "value", op: "account", account: "home" }], result: "value" },
		})
		expect(flow("home-loan-payment")).toMatchObject({ end: "2030-07-14", level: { payments: 180 } })
		expect(flow("home-selling-cost")).toMatchObject({ kind: "expense", start: "2030-07-15" })
		expect(dayBefore("2030-07-15")).toBe("2030-07-14")
	})

	test("the document stays one the contract accepts", () => {
		expect(scenarioDocument.safeParse(doc).success).toBe(true)
	})
})

describe("no percentage or rounding is chosen for the person", () => {
	test("a new form holds no rate, no direction, no rounding and no amount", () => {
		const draft = newAssetDraft()
		expect([draft.valueRate, draft.direction, draft.rounding, draft.price]).toEqual([
			"",
			"",
			"",
			"",
		])
		expect([draft.running.rate, draft.rent.rate, draft.saleCost.rate]).toEqual(["", "", ""])
		expect([draft.loan.rate, draft.loan.rounding, draft.loan.principal]).toEqual(["", "", ""])
		expect([draft.running.mode, draft.rent.mode, draft.selling]).toEqual(["none", "none", "none"])
	})

	test("saving a form with no rate or rounding is refused at those fields", () => {
		const draft = homeDraft({ valueRate: "", direction: "", rounding: "" })
		const problems = assetProblemsOf(draft, CHECK)
		expect([...problems.keys()].sort()).toEqual(["direction", "rounding", "valueRate"])
		expect(assetFromDraft(draft, { doc: planDocument(), check: CHECK }).ok).toBe(false)
	})

	test("a percent of the value is never negative, and a fall is chosen, not typed with a sign", () => {
		const bad = homeDraft({ valueRate: "-3", running: { ...homeDraft().running, rate: "-1" } })
		expect([...assetProblemsOf(bad, CHECK).keys()].sort()).toEqual(["running.rate", "valueRate"])
		const fall = partsOf(homeDraft({ direction: "fall", valueRate: "2.5" }))
		expect(fall.account.rate).toBe(-250)
	})
})

describe("editing reads the items back", () => {
	test("the draft of the parts is the draft that was saved, and saving it again changes nothing", () => {
		const doc = planWithHome()
		const [home] = realAssetsOf(doc)
		if (home === undefined) throw new Error("no real asset")
		expect(home.outside).toEqual([])
		const draft = assetDraftOf(home.parts)
		expect(draft).toEqual({
			...homeDraft(),
			name: "home",
			loan: { ...homeDraft().loan, name: "home-loan", arrivalDate: "2027-07-15", arrival: "date" },
		})
		const again = assetFromDraft(draft, {
			existing: home.parts,
			doc,
			check: { isNew: false, ownedIds: [] },
		})
		if (!again.ok) throw new Error(JSON.stringify(again.problems))
		expect(assetDocument(doc, again.parts, home.parts)).toEqual(doc)
	})

	test("taking the sale out takes its cost, its payoff and the end dates with it", () => {
		const doc = planWithHome()
		const [home] = realAssetsOf(doc)
		if (home === undefined) throw new Error("no real asset")
		const result = assetFromDraft(assetDraftOf(home.parts), {
			existing: home.parts,
			doc,
			check: { isNew: false, ownedIds: [] },
		})
		if (!result.ok) throw new Error("refused")
		const kept = assetFromDraft(
			{ ...assetDraftOf(home.parts), selling: "none" },
			{ existing: home.parts, doc, check: { isNew: false, ownedIds: [] } },
		)
		if (!kept.ok) throw new Error(JSON.stringify(kept.problems))
		const next = assetDocument(doc, kept.parts, home.parts)
		const left = next.flows.map((f) => f.id)
		expect(left).not.toContain("home-sale")
		expect(left).not.toContain("home-selling-cost")
		expect(left).not.toContain("home-loan-payoff")
		expect(next.flows.find((f) => f.id === "home-running")?.end).toBeUndefined()
		expect(next.flows.find((f) => f.id === "home-loan-payment")?.end).toBeUndefined()
	})
})
