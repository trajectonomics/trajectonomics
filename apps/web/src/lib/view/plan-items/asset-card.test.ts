import { describe, expect, test } from "bun:test"
import { assetCardsOf } from "./asset-card"
import { homeDraft, planWithHome } from "./asset-fixtures.test-support"
import { homeRun } from "./asset-run.test-support"

const doc = planWithHome(homeDraft({ saleDate: "2028-07-15" }))
const [card] = assetCardsOf(doc, undefined, homeRun())

describe("a home's card", () => {
	test("the value comes from the `balances` rows, in the CLI's own strings, with the purchase and sale marked", () => {
		const nominal = card?.chart?.series[0]
		expect(nominal?.points.map((point) => point.display)).toEqual(["1,513,176.79", "0.00", "0.00"])
		expect(card?.chart?.series[1]?.dashed).toBe(true)
		expect(card?.chart?.markers.map((marker) => marker.label)).toEqual(["Bought", "Sold"])
	})

	test("the loan's paid-off date, this year's running costs and rent are the CLI's lines", () => {
		expect(card?.loan).toEqual({ paidOff: "2028-07-15", known: true })
		expect(card?.year).toEqual({
			from: "2026-10-31",
			to: "2027-10-30",
			running: "3768.78",
			rent: "1884.39",
		})
	})

	test("a taxed plan says rent and the sale are not taxed, and an untaxed one does not", () => {
		expect(card?.untaxed).toBe(true)
		const [free] = assetCardsOf(doc, undefined, homeRun({ tax: "not_applied" }))
		expect(free?.untaxed).toBe(false)
	})

	test("a rent that carries a Tally label, with no sale, needs no notice", () => {
		const labelled = planWithHome(homeDraft({ selling: "none" }))
		const withLabel = {
			...labelled,
			flows: labelled.flows.map((flow) =>
				flow.id === "home-rent" ? { ...flow, label: "income.section40_5.building" } : flow,
			),
		}
		expect(assetCardsOf(withLabel, undefined, homeRun())[0]?.untaxed).toBe(false)
	})

	test("money the engine reports not funded in the purchase's year is named, not hidden", () => {
		expect(card?.unfunded).toEqual([{ from: "2026-10-31", to: "2027-10-30" }])
	})

	test("a run without `--accounts` has no chart, and the card still shows its terms", () => {
		const [bare] = assetCardsOf(doc, undefined, homeRun({ tables: [] }))
		expect(bare?.chart).toBeNull()
		expect(bare?.rows.map((row) => row.label)).toContain("Bought")
	})

	test("each item of the asset has a what-if switch", () => {
		expect(card?.switches.map((item) => item.id)).toContain("home-sale")
		expect(card?.switches.map((item) => item.id)).not.toContain("home")
	})
})
