import { describe, expect, test } from "bun:test"
import { assetCardsOf } from "./asset-card"
import { realAssetsOf } from "./asset-document"
import { homeDraft, planWithHome } from "./asset-fixtures.test-support"
import { homeRun } from "./asset-run.test-support"
import { assetSwitch } from "./group-switch"

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

	test("the asset has one what-if switch, which takes every item out together", () => {
		const paths = card?.switch.spec.paths ?? []
		expect(paths).toEqual(
			expect.arrayContaining([
				"accounts.home",
				"accounts.home-loan",
				"flows.home-purchase",
				"flows.home-loan-draw",
				"flows.home-loan-payment",
				"flows.home-loan-payoff",
				"flows.home-sale",
			]),
		)
		expect(card?.switch.removals).toEqual(paths)
	})

	test("an Account the Baseline holds stays declared when the asset is switched off", () => {
		const held = (id: string) => id === "home"
		const kept = assetSwitch(doc, { parts: realAssetsOf(doc)[0]!.parts, outside: [] }, held)
		expect(kept.removals).not.toContain("accounts.home")
		expect(kept.removals).toContain("flows.home-sale")
		expect(kept.spec.paths).toContain("accounts.home")
	})
})
