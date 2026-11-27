import { describe, expect, test } from "bun:test"
import { itemNames } from "../item-names"
import { estateDates } from "./dates"
import { diagramBands } from "./diagram.test-support"
import { figuresAt, shownUnder } from "./figures"
import { demoPlan, householdOf } from "./fixtures.test-support"
import { estateSummaryOf } from "./home"
import { noCostNote } from "./notes"
import { estateRowsOf, rowOn } from "./rows"
import { heirsSeries } from "./series"
import { estateView } from "./view"

const base = demoPlan("base")

describe("the row a date reads", () => {
	const rows = estateRowsOf(base.run)

	test("a date between two roll-up ends reads the first end after it", () => {
		expect(rowOn(rows, "2031-06-01")?.date).toBe("2031-10-31")
		expect(rowOn(rows, "2031-10-31")?.date).toBe("2031-10-31")
		expect(rowOn(rows, "2031-10-30")?.date).toBe("2031-10-31")
	})

	test("a date past the plan's last year reads the last row, and a run with no estate reads none", () => {
		expect(rowOn(rows, "2099-01-01")?.date).toBe("2053-12-31")
		expect(rowOn([], "2031-01-01")).toBeNull()
	})
})

describe("the default date", () => {
	test("with one person it is the roll-up end where they reach their life expectancy", () => {
		const one = householdOf([{ id: "me", role: "holder", lifeExpectancy: 40 }])
		const dates = estateDates(base.run, base.doc, one, "")
		expect(dates?.chosen).toMatchObject({ value: "life", date: "2030-10-30" })
		expect(dates?.chosen.label).toContain("Life expectancy: me, age 40")
		expect(dates?.beyond).toBeNull()
		expect(figuresAt(base.run, "2030-10-30")?.date).toBe("2030-10-31")
		// The choice reads the date of the row the table and the headline show.
		expect(dates?.chosen.label).toContain("31 Oct 2030")
		expect(dates?.choices.find((one) => one.value === "person:me")?.label).toContain("31 Oct 2030")
	})

	test("with two people it is the later one, and each is a choice of its own", () => {
		const two = householdOf([
			{ id: "me", role: "holder", lifeExpectancy: 40 },
			{ id: "partner", role: "partner", lifeExpectancy: 41 },
		])
		const dates = estateDates(base.run, base.doc, two, "")
		expect(dates?.chosen).toMatchObject({ value: "life", date: "2033-10-30" })
		expect(dates?.chosen.label).toContain("Later life expectancy: partner, age 41")
		expect(dates?.choices.map((one) => one.value)).toEqual(
			expect.arrayContaining(["person:me", "person:partner", "end"]),
		)
		expect(estateDates(base.run, base.doc, two, "person:me")?.chosen.date).toBe("2030-10-30")
	})

	test("a dependent is not an heir's anchor: their life expectancy never moves the default", () => {
		const family = householdOf([
			{ id: "me", role: "holder", lifeExpectancy: 40 },
			{ id: "kid", role: "dependent", lifeExpectancy: 90 },
		])
		expect(estateDates(base.run, base.doc, family, "")?.chosen.date).toBe("2030-10-30")
	})

	test("with no household, or when the plan ends before the life expectancy, it is the plan's last year, and says why", () => {
		const none = estateDates(base.run, base.doc, null, "")
		expect(none?.chosen).toMatchObject({ value: "end", date: "2053-12-31" })
		expect(none?.beyond).toContain("names no adult")
		const demo = estateDates(base.run, base.doc, base.household, "")
		expect(demo?.chosen).toMatchObject({ value: "life", date: "2053-12-31" })
		expect(demo?.beyond).toContain("before me and partner reach")
	})

	test("a Milestone, a household anchor and the last year are choices, and an unknown choice reads the default", () => {
		const dates = estateDates(base.run, base.doc, base.household, "milestone:car-paid-off")
		expect(dates?.chosen.date).toBe("2031-01-01")
		const values = dates?.choices.map((one) => one.value)
		expect(values).toEqual(expect.arrayContaining(["anchor:flows.fund.end", "end"]))
		expect(
			estateDates(base.run, base.doc, base.household, "anchor:flows.fund.end")?.chosen.date,
		).toBe("2050-06-30")
		expect(estateDates(base.run, base.doc, base.household, "nowhere")?.chosen.value).toBe("life")
	})

	test("a Milestone choice reads the name the plan states for it, or its id when it states none", () => {
		const names = itemNames(new Map(), null, {
			currency: "THB",
			accounts: [],
			flows: [],
			milestones: [{ id: "car-paid-off", displayLabel: "Car paid off" }],
		})
		const labelled = estateDates(base.run, base.doc, base.household, "", names)
		expect(labelled?.choices.find((one) => one.value === "milestone:car-paid-off")?.label).toBe(
			"When Car paid off fires (1 Jan 2031)",
		)
		const bare = estateDates(base.run, base.doc, base.household, "")
		expect(bare?.choices.find((one) => one.value === "milestone:car-paid-off")?.label).toBe(
			"When car-paid-off fires (1 Jan 2031)",
		)
	})
})

describe("what the date states", () => {
	test("the last year of the Demo, worked by hand: 1% of 16,775,132.11 and a fixed fee, then 5% of the net", () => {
		const figures = figuresAt(base.run, "2053-12-31")
		expect(figures?.row).toMatchObject({
			gross: "16775132.11",
			debts: "0.00",
			costs: "278815.77",
			net: "16496316.34",
			gifts: "824815.82",
			toHeirs: "15671500.52",
			realNet: "7389865.10",
			realToHeirs: "7020371.84",
		})
		expect(figures?.costs.map((one) => [one.label, one.amount])).toEqual([
			["settlement", "167751.32"],
			["court-and-legal-fees", "111064.45"],
		])
		expect(figures?.gifts.map((one) => [one.label, one.amount])).toEqual([["temple", "824815.82"]])
		expect(figures?.shortfall).toBeNull()
	})

	test("only the net and what heirs receive have a figure in today's money; the rest stay nominal, and say so", () => {
		const items = figuresAt(base.run, "2053-12-31")?.items ?? []
		const real = (key: string) => items.find((one) => one.key === key)
		expect(real("net")?.real).toBe("7389865.10")
		expect(real("heirs")?.real).toBe("7020371.84")
		expect(real("gross")?.real).toBeNull()
		const gross = real("gross")
		const heirs = real("heirs")
		if (gross === undefined || heirs === undefined) throw new Error("the lines exist")
		expect(shownUnder(gross, "real")).toEqual({
			amount: "16775132.11",
			tag: "Future money",
			aside: null,
		})
		expect(shownUnder(heirs, "real")).toEqual({
			amount: "7020371.84",
			tag: "Today's money",
			aside: null,
		})
		expect(shownUnder(heirs, "both")).toEqual({
			amount: "15671500.52",
			tag: null,
			aside: "7020371.84",
		})
		expect(shownUnder(heirs, "nominal").aside).toBeNull()
	})

	test("a negative net is stated as it is: the shortfall is the net without its sign, heirs and gifts are nothing, and there is no diagram", () => {
		const run = structuredClone(base.run)
		const table = run.tables.find((one) => one.name === "estate")
		if (table?.name !== "estate") throw new Error("no estate table")
		const last = table.rows[table.rows.length - 1]
		if (last === undefined) throw new Error("no row")
		Object.assign(last, { net: "-12500.00", gifts: "0.00", toHeirs: "0.00", realToHeirs: "0.00" })
		const view = estateView(run, "2053-12-31", "both")
		expect(view?.figures.shortfall).toBe("12500.00")
		expect(view?.flow).toBeNull()
		expect(view?.figures.row.toHeirs).toBe("0.00")
	})

	test("the diagram runs from the gross estate to the debts, each cost, each gift and heirs", () => {
		expect(diagramBands(base.run)).toEqual({
			sources: ["gross"],
			uses: ["debts", "cost:settlement", "cost:court-and-legal-fees", "gift:temple", "heirs"],
		})
	})

	test("the year-by-year line has one point per roll-up end, nominal and in today's money, and a mark on the date read", () => {
		const both = heirsSeries(base.run, "both")
		expect(both.map((one) => one.name)).toEqual([
			"What heirs receive",
			"What heirs receive, in today's money",
		])
		expect(both[0]?.points).toHaveLength(28)
		expect(both[0]?.points.at(-1)?.display).toBe("15,671,500.52")
		expect(heirsSeries(base.run, "real")).toHaveLength(1)
		expect(estateView(base.run, "2031-10-31", "both")?.markers).toEqual([{ x: 4, label: "2031" }])
	})
})

describe("the notes and the Home card", () => {
	test("a plan with no settlement cost says so, and a plan with a cost does not", () => {
		expect(noCostNote(base.doc)).toBeNull()
		const bare = demoPlan("retire-early")
		expect(noCostNote(bare.doc)).toContain("states no settlement cost")
		const giftsOnly = { ...base.doc, estate: { gifts: base.doc.estate?.gifts ?? [] } }
		expect(noCostNote(giftsOnly)).not.toBeNull()
	})

	test("the card states what heirs receive on the default date, and what it is", () => {
		expect(estateSummaryOf(base.run, base.doc, base.household)).toEqual({
			toHeirs: "15671500.52",
			date: "2053-12-31",
			currency: "THB",
			noCost: false,
			short: false,
			notes: base.run.notes,
		})
		const bare = demoPlan("retire-early")
		expect(estateSummaryOf(bare.run, bare.doc, bare.household)?.noCost).toBe(true)
	})

	test("a household with no adult reads the plan's last year", () => {
		expect(estateSummaryOf(base.run, base.doc, null)?.date).toBe("2053-12-31")
		expect(estateSummaryOf(base.run, base.doc, householdOf([]))?.date).toBe("2053-12-31")
	})

	test("no diagram is drawn when the gross estate is nothing", () => {
		const run = structuredClone(base.run)
		for (const table of run.tables)
			if (table.name === "estate") Object.assign(table.rows.at(-1) ?? {}, { gross: "0.00" })
		expect(estateView(run, "2053-12-31", "both")?.flow).toBeNull()
		expect(estateView(base.run, "2053-12-31", "both")?.flow).not.toBeNull()
	})
})
