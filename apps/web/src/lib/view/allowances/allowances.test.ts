import { describe, expect, test } from "bun:test"
import { documentWithSuggestions, suggestionAdditions } from "./add"
import { GOLDEN_ALLOWANCES, inYear, withoutTarget, withSsf } from "./fixtures.test-support"
import { allowancesSummaryOf } from "./home"
import { draftOf, planFromDraft } from "./inputs"
import { chosenLabels, moved, orderOf, toggled } from "./order"
import { ESTIMATE_NOTE } from "./words"
import { allowancesView } from "./years"

const RMF = "allowance.retirement.rmf"
const ESG = "allowance.thai_esg"

describe("the order of the allowances", () => {
	test("nothing is on before the person chooses, and the Levy's own order is offered", () => {
		const order = orderOf(null)
		expect(chosenLabels(order)).toEqual([])
		expect(order.map((choice) => choice.name)).toEqual([
			"RMF",
			"ThaiESG",
			"Provident fund",
			"Government pension fund",
			"National Savings Fund",
			"Pension life insurance",
		])
	})

	test("SSF is never offered: its purchases are no longer deductible", () => {
		expect(orderOf(null).map((choice) => choice.label)).not.toContain("allowance.retirement.ssf")
	})

	test("the chosen allowances come first in the person's order, and moving one changes the read's order", () => {
		const plan = { labels: [ESG, RMF], step: "1000", budget: null, minSaving: null }
		expect(chosenLabels(orderOf(plan))).toEqual([ESG, RMF])
		const flipped = moved(orderOf(plan), RMF, -1)
		expect(chosenLabels(flipped)).toEqual([RMF, ESG])
		expect(chosenLabels(toggled(flipped, ESG))).toEqual([RMF])
	})

	test("an allowance moved past an end stays where it is", () => {
		const order = orderOf(null)
		expect(moved(order, RMF, -1).map((choice) => choice.label)).toEqual(
			order.map((choice) => choice.label),
		)
	})
})

describe("the inputs the person types", () => {
	test("the step is pre-filled with 1000 and no limit has a value before the person types one", () => {
		expect(draftOf(null)).toEqual({ step: "1000", budget: "", minSaving: "" })
	})

	test("an empty limit is none, and the plan carries the order and the step as typed", () => {
		const order = toggled(orderOf(null), RMF)
		const result = planFromDraft(order, draftOf(null))
		expect(result).toEqual({
			ok: true,
			plan: { labels: [RMF], step: "1000", budget: null, minSaving: null },
		})
	})

	test("a step of one major unit or less is refused at the Step field, and a larger one is taken", () => {
		const step = (text: string) =>
			planFromDraft([{ label: RMF, name: "RMF", on: true }], {
				step: text,
				budget: "",
				minSaving: "",
			})
		for (const text of ["0", "00", "0.5", "1", "1.0", "01", "1.000000"]) {
			const result = step(text)
			expect(result.ok).toBe(false)
			if (!result.ok) expect(result.problems.step).toContain("larger than one major unit")
		}
		for (const text of ["2", "1.01", "01.5", "10", "1000", "1000.50", "0010"]) {
			expect(step(text).ok).toBe(true)
		}
	})

	test("each field with a problem says so at its own field", () => {
		const result = planFromDraft(orderOf(null), { step: "a lot", budget: "-5", minSaving: "101" })
		expect(result.ok).toBe(false)
		if (result.ok) return
		expect(Object.keys(result.problems).sort()).toEqual(["budget", "labels", "minSaving", "step"])
	})
})

describe("the reading of one allowances result", () => {
	test("the year the As-of falls in is first, with the tax due now, with every suggestion and the saving", () => {
		const view = allowancesView(inYear("2026-03-01"))
		expect(view.current?.period).toBe("2026")
		expect(view.current?.dueBefore).toBe("28400.00")
		expect(view.current?.dueAfter).toBe("300.00")
		expect(view.current?.saving).toBe("28100.00")
		expect(view.later.map((year) => year.period)).toEqual(["2027"])
	})

	test("an As-of in no year the read states leaves every year to the table", () => {
		const view = allowancesView({ ...GOLDEN_ALLOWANCES, asOf: "2025-06-01" })
		expect(view.current).toBeNull()
		expect(view.later).toHaveLength(2)
	})

	test("each allowance has its readable name, planned amount, extra, saving and the stop in words", () => {
		const [rmf, esg] = allowancesView(GOLDEN_ALLOWANCES).current?.lines ?? []
		expect(rmf).toMatchObject({
			name: "RMF",
			planned: "45000.00",
			extra: "170000.00",
			saving: "17300.00",
		})
		expect(esg?.name).toBe("ThaiESG")
		expect(rmf?.why).toBe("No more is saved: the cap is reached or the tax stops falling.")
	})

	test("a year offers the Flows that have an Account and lists the ones that do not with their hint", () => {
		const whole = allowancesView(GOLDEN_ALLOWANCES).current
		expect(whole?.addable).toBe(true)
		expect(whole?.unplaced).toEqual([])
		const lacking = allowancesView(withoutTarget()).current
		expect(lacking?.addable).toBe(true)
		expect(lacking?.placeable.map((flow) => flow.id)).toEqual(["esg-fund-thai-esg-2026"])
		expect(lacking?.unplaced).toHaveLength(1)
		expect(lacking?.unplaced[0]?.name).toBe("RMF")
		expect(lacking?.unplaced[0]?.hint).toContain("Pick the asset Account")
		const none = withoutTarget()
		for (const row of none.allowances) delete row.flow?.target
		expect(allowancesView(none).current?.addable).toBe(false)
	})

	test("the estimate sentence is said once: the CLI's note stands, ours is added only when it is missing", () => {
		const said = (notes: readonly { text: string }[]) =>
			notes.filter((note) => /tax advice/i.test(note.text))
		expect(said(allowancesView(GOLDEN_ALLOWANCES).notes)).toHaveLength(1)
		expect(said(allowancesView({ ...GOLDEN_ALLOWANCES, notes: [] }).notes)).toHaveLength(1)
		const ours = allowancesView({ ...GOLDEN_ALLOWANCES, notes: [] }).notes.filter(
			(note) => !note.fromCli,
		)
		expect(ours.map((note) => note.text)).toEqual([ESTIMATE_NOTE])
		expect(allowancesView(GOLDEN_ALLOWANCES).notes.every((note) => note.fromCli)).toBe(true)
	})

	test("SSF is stated as no longer deductible and never as a missed saving", () => {
		const ssf = allowancesView(withSsf()).current?.lines.find((line) => line.ssf)
		expect(ssf?.why).toBe("SSF purchases are no longer deductible from 2025.")
		expect(ssf?.flow).toBeUndefined()
		expect(allowancesView(withSsf()).current?.flows).toHaveLength(2)
	})
})

describe("keeping a year's suggestions", () => {
	test("Add to plan appends the CLI's Flows, untouched, to the plan's Flows", () => {
		const flows = allowancesView(GOLDEN_ALLOWANCES).current?.flows ?? []
		const doc = { currency: "THB", flows: [], accounts: [] }
		expect(documentWithSuggestions(doc, flows).flows.map((flow) => flow.id)).toEqual([
			"rmf-fund-rmf-2026",
			"esg-fund-thai-esg-2026",
		])
	})

	test("Try as what-if sends each Flow as one flows Addition with its fields as the CLI stated them", () => {
		const flows = allowancesView(GOLDEN_ALLOWANCES).current?.flows ?? []
		const [first] = suggestionAdditions(flows)
		expect(first?.list).toBe("flows")
		expect(first?.item).toMatchObject({
			id: "rmf-fund-rmf-2026",
			amount: "170000.00",
			target: "rmf-fund",
		})
	})
})

describe("the Home card", () => {
	test("states the current year's saving when it is above zero, unnamed for one Return", () => {
		expect(allowancesSummaryOf(inYear("2026-03-01"))).toEqual({
			savings: [
				{
					key: "th-2026-pit:2026-01-01",
					name: null,
					saving: "28100.00",
				},
			],
			currency: "THB",
			period: "2026",
		})
	})

	test("is not shown when the current year saves nothing more, or the As-of is in no stated year", () => {
		const none = inYear("2026-03-01")
		const [year] = none.taxYears
		if (year === undefined) throw new Error("the golden has a year")
		year.saving = "0.00"
		expect(allowancesSummaryOf(none)).toBeNull()
		expect(allowancesSummaryOf({ ...GOLDEN_ALLOWANCES, asOf: "2030-01-01" })).toBeNull()
	})
})
