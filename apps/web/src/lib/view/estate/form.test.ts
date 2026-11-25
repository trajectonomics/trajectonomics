import { describe, expect, test } from "bun:test"
import { blockFromDraft } from "./build"
import { problemsOf } from "./check"
import { withEstate } from "./document"
import { draftOf, emptyLine, moveLine } from "./draft"
import { demoPlan } from "./fixtures.test-support"

const base = demoPlan("base")

describe("the form's text", () => {
	test("a plan with no estate block opens on two empty lists, and a new line holds nothing: no share, no amount, no rounding", () => {
		expect(draftOf(undefined)).toEqual({ costs: [], gifts: [] })
		expect(emptyLine()).toEqual({
			id: "",
			name: "",
			how: "",
			of: "",
			accounts: [],
			share: "",
			rounding: "",
			amount: "",
			growth: "",
			rate: "",
		})
	})

	test("the plan's own lines are read as the document states them: a share as a percent, a fixed amount in major units", () => {
		const draft = draftOf(base.doc.estate)
		expect(draft.costs[0]).toMatchObject({
			id: "settlement",
			how: "share",
			of: "gross",
			share: "1.00",
			rounding: "halfUp",
		})
		expect(draft.costs[1]).toMatchObject({
			id: "court-and-legal-fees",
			how: "fixed",
			amount: "50000.00",
			growth: "inflation",
		})
		expect(draft.gifts[0]).toMatchObject({ id: "temple", how: "share", share: "5.00" })
	})

	test("a line can move up and down its list, and one at the edge stays", () => {
		const draft = draftOf(base.doc.estate)
		expect(moveLine(draft, "costs", 0, 1).costs.map((one) => one.id)).toEqual([
			"court-and-legal-fees",
			"settlement",
		])
		expect(moveLine(draft, "costs", 0, -1)).toBe(draft)
	})
})

describe("what the form checks, and what it leaves to traj", () => {
	test("an unchosen way, base, rounding or growth is a problem at its field, and a share's shape too", () => {
		const draft = {
			costs: [emptyLine()],
			gifts: [{ ...emptyLine(), name: "temple", how: "share" }],
		}
		expect([...problemsOf(draft).keys()]).toEqual([
			"costs.0.name",
			"costs.0.how",
			"gifts.0.share",
			"gifts.0.rounding",
		])
		const fixed = {
			...emptyLine(),
			name: "fee",
			how: "fixed",
			amount: "5,0",
			growth: "fixed",
			rate: "x",
		}
		expect([...problemsOf({ costs: [fixed], gifts: [] }).keys()]).toEqual([
			"costs.0.amount",
			"costs.0.rate",
		])
		const third = {
			...emptyLine(),
			name: "x",
			how: "share",
			of: "gross",
			share: "1.005",
			rounding: "floor",
		}
		expect(problemsOf({ costs: [third], gifts: [] }).get("costs.0.share")).toContain("two places")
	})

	test("a name that makes an id someone has is a problem, and a cost's accounts are needed when it is of accounts", () => {
		const share = { ...emptyLine(), how: "share", share: "1", rounding: "floor", of: "accounts" }
		const draft = {
			costs: [
				{ ...share, name: "Court Fees" },
				{ ...share, name: "court-fees", of: "gross" },
			],
			gifts: [],
		}
		const found = problemsOf(draft)
		expect(found.get("costs.0.accounts")).toBe("Choose at least one Account.")
		expect(found.get("costs.1.name")).toBe("Another line already has this name.")
	})

	test("a name of digits only is a problem, since a refusal could read it as a place in the list", () => {
		const share = { ...emptyLine(), how: "share", share: "1", rounding: "floor", of: "gross" }
		const found = problemsOf({ costs: [{ ...share, name: "1" }], gifts: [] })
		expect(found.get("costs.0.name")).toContain("at least one letter")
		expect(problemsOf({ costs: [{ ...share, name: "fee-1" }], gifts: [] }).size).toBe(0)
	})

	test("a stored rounding the form does not offer is kept as it is, and a different unknown word is refused", () => {
		const block = {
			costs: [{ id: "settlement", of: "gross", bps: "1.00", rounding: "banker" }],
			gifts: [],
		}
		const draft = draftOf(block)
		expect(draft.costs[0]?.rounding).toBe("banker")
		expect(blockFromDraft(draft, block).ok).toBe(true)
		const typed = { ...draft, costs: [{ ...draft.costs[0]!, rounding: "weird" }] }
		const result = blockFromDraft(typed, block)
		expect(result.ok).toBe(false)
		if (!result.ok)
			expect(result.problems).toEqual({
				"costs.0.rounding": "Choose how the share rounds to a minor unit.",
			})
	})
})

describe("the block a draft saves as", () => {
	const typed = {
		costs: [
			{
				...emptyLine(),
				name: "Court fees",
				how: "fixed",
				amount: "50,000.00",
				growth: "fixed",
				rate: "2.5",
			},
			{
				...emptyLine(),
				name: "settlement",
				how: "share",
				share: "1",
				rounding: "halfUp",
				of: "gross",
			},
			{
				...emptyLine(),
				name: "sale",
				how: "share",
				share: "3",
				rounding: "floor",
				of: "accounts",
				accounts: ["home"],
			},
		],
		gifts: [{ ...emptyLine(), name: "temple", how: "share", share: "5.5", rounding: "ceil" }],
	}

	test("each line is written as the decimal document reads it, in the order stated, with a gift's base the net estate", () => {
		const result = blockFromDraft(typed)
		expect(result).toEqual({
			ok: true,
			block: {
				costs: [
					{ id: "court-fees", amount: "50000.00", growth: { bps: 250 } },
					{ id: "settlement", of: "gross", bps: "1", rounding: "halfUp" },
					{ id: "sale", of: { accounts: ["home"] }, bps: "3", rounding: "floor" },
				],
				gifts: [{ id: "temple", of: "net", bps: "5.5", rounding: "ceil" }],
			},
		})
	})

	test("an existing line keeps its id when its name is shown, and the saved document replaces only the estate", () => {
		const draft = draftOf(base.doc.estate)
		const result = blockFromDraft(draft)
		expect(result).toEqual({ ok: true, block: base.doc.estate ?? null })
		if (!result.ok) throw new Error("the plan's own lines save")
		expect(withEstate(base.doc, result.block)).toEqual(base.doc)
	})

	test("no line left saves no block at all, so the plan is as it was before", () => {
		const result = blockFromDraft({ costs: [], gifts: [] })
		expect(result).toEqual({ ok: true, block: null })
		if (!result.ok) throw new Error("empty saves")
		const bare = demoPlan("retire-early").doc
		expect("estate" in withEstate(base.doc, result.block)).toBe(false)
		expect(withEstate(bare, null)).toEqual(bare)
	})

	test("a draft with a problem sends nothing", () => {
		expect(blockFromDraft({ costs: [emptyLine()], gifts: [] }).ok).toBe(false)
	})
})
