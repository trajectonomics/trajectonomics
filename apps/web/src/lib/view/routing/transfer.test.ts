import { describe, expect, test } from "bun:test"
import { formatMoney } from "../../format"
import { startWhatIf } from "../../what-if/session"
import { documentWith, sessionWith } from "./change"
import { planWith } from "./fixtures.test-support"
import { transferFromDraft } from "./transfer-build"
import { type TransferContext, transferDraftOf } from "./transfer-draft"
import { movesOf } from "./transfer-read"
import { transferWords } from "./transfer-words"
import { plainText } from "./words"

const ctx: TransferContext = {
	milestones: ["retire"],
	anchors: [{ value: "anchor:flows.job.end", label: "When job ends", date: "2031-06-30" }],
	asOf: "2027-01-01",
}
const NAMES = new Map([
	["pvd", "Provident fund"],
	["rmf", "RMF"],
	["bank", "Savings"],
	["fd", "Fixed deposit"],
])
const blank = transferDraftOf(undefined, ctx)
const make = (
	draft: typeof blank,
	existing?: Parameters<typeof transferFromDraft>[1]["existing"],
) => transferFromDraft(draft, { existing, taken: ["transfer"], ctx })
const said = (flow: Parameters<typeof transferWords>[0]) =>
	plainText(transferWords(flow, NAMES), formatMoney)

describe("a transfer in its drawer writes what the schema accepts", () => {
	test("all of an account on a date: a derive that reads the source, once, no realise key", () => {
		const made = make({ ...blank, source: "pvd", target: "rmf", date: "2031-06-30" })
		if (!made.ok) throw new Error(JSON.stringify(made.problems))
		expect(made.flow).toEqual({
			id: "transfer-2",
			kind: "transfer",
			source: "pvd",
			target: "rmf",
			frequency: "once",
			start: "2031-06-30",
			derive: { measures: [{ id: "held", op: "account", account: "pvd" }], result: "held" },
		})
		expect(said(made.flow)).toBe("Move all of Provident fund to RMF on 30 Jun 2031")
		expect(movesOf(made.flow)).toEqual({ how: "all" })
	})

	test("a share every year: the percent as basis points over 10,000, rounded down", () => {
		const made = make({
			...blank,
			source: "bank",
			target: "fd",
			how: "share",
			share: "10",
			frequency: "annual",
			date: "2028-01-31",
		})
		if (!made.ok) throw new Error("refused")
		expect(made.flow["derive"]).toMatchObject({
			measures: [
				{ op: "account" },
				{ op: "scale", of: "held", num: 1000, den: 10000, rounding: "floor" },
			],
			result: "part",
		})
		expect(said(made.flow)).toBe(
			"Move 10% of Savings to Fixed deposit every year, from 31 Jan 2028",
		)
		expect(transferDraftOf(made.flow, ctx)).toMatchObject({
			how: "share",
			share: "10.00",
			frequency: "annual",
		})
	})

	test("an amount, in today's money or not, from a Milestone, and realise only when it is on", () => {
		const draft = {
			...blank,
			source: "bank",
			target: "fd",
			how: "amount" as const,
			amount: "5,000",
			when: "milestone" as const,
			milestone: "retire",
		}
		const flat = make(draft)
		const real = make({ ...draft, growth: "inflation" as const, realise: true })
		if (!flat.ok || !real.ok) throw new Error("refused")
		expect(flat.flow).toMatchObject({
			amount: "5000",
			growth: { bps: 0 },
			startAt: "retire",
			start: "2027-01-01",
		})
		expect("realise" in flat.flow).toBe(false)
		expect(real.flow).toMatchObject({ growth: "inflation", realise: true })
		expect(said(real.flow)).toBe(
			"Move 5,000 in today's money from Savings to Fixed deposit when retire fires",
		)
	})

	test("an amount that grows by a fixed rate round trips: an untouched growth is never turned into none", () => {
		const draft = {
			...blank,
			source: "bank",
			target: "fd",
			how: "amount" as const,
			amount: "5000",
			growth: "fixed" as const,
			rate: "3",
			date: "2030-01-01",
		}
		const made = make(draft)
		if (!made.ok) throw new Error("refused")
		expect(made.flow).toMatchObject({ amount: "5000", growth: { bps: 300 } })
		const again = make(transferDraftOf(made.flow, ctx), made.flow)
		expect(transferDraftOf(made.flow, ctx)).toMatchObject({ growth: "fixed", rate: "3.00" })
		expect(again).toEqual({ ok: true, flow: made.flow })
		expect(said(made.flow)).toContain("growing 3.00% a year")
		expect(make({ ...draft, rate: "x" })).toMatchObject({
			ok: false,
			problems: { rate: expect.any(String) },
		})
	})

	test("a date the household names is written as a plain date, and reads back as that choice", () => {
		const made = make({
			...blank,
			source: "bank",
			target: "fd",
			when: "anchor",
			anchor: "anchor:flows.job.end",
		})
		if (!made.ok) throw new Error("refused")
		expect(made.flow.start).toBe("2031-06-30")
		expect(transferDraftOf(made.flow, ctx)).toMatchObject({
			when: "anchor",
			anchor: "anchor:flows.job.end",
		})
	})

	test("every field that is not a shape traj may take is a problem at that field", () => {
		const made = make({ ...blank, how: "amount", amount: "x", date: "soon", end: "later" })
		expect(made).toMatchObject({ ok: false })
		if (!made.ok)
			expect(Object.keys(made.problems).sort()).toEqual([
				"amount",
				"end",
				"source",
				"start",
				"target",
			])
	})

	test("an edit keeps the keys the form does not show; the Edit saves it and a try replaces it", () => {
		const first = make({ ...blank, source: "bank", target: "fd", date: "2030-01-01" })
		if (!first.ok) throw new Error("refused")
		const stored = { ...first.flow, label: "mine" }
		const edited = make({ ...transferDraftOf(stored, ctx), frequency: "monthly" }, stored)
		if (!edited.ok) throw new Error("refused")
		expect(edited.flow).toMatchObject({ id: stored.id, label: "mine", frequency: "monthly" })
		const doc = documentWith(planWith(undefined), { kind: "transfer", flow: stored })
		expect(documentWith(doc, { kind: "remove", id: stored.id }).flows).toEqual([])
		const tried = sessionWith(startWhatIf("p", "h"), doc, { kind: "transfer", flow: edited.flow })
		expect(tried.sets).toEqual([{ path: `flows.${stored.id}.frequency`, value: "monthly" }])
	})
})
