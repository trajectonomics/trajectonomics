import { describe, expect, test } from "bun:test"
import { assetProblemsOf, CHECK, homeDraft } from "./asset-fixtures.test-support"

describe("the sale date", () => {
	test("is refused when it is not after the loan's first payment", () => {
		const draft = homeDraft({ saleDate: "2027-08-15" })
		expect(assetProblemsOf(draft, CHECK).get("saleDate")).toContain("first loan payment")
		const early = homeDraft({ saleDate: "2027-08-01" })
		expect(assetProblemsOf(early, CHECK).get("saleDate")).toContain("first loan payment")
		expect(assetProblemsOf(homeDraft({ saleDate: "2027-08-16" }), CHECK).has("saleDate")).toBe(
			false,
		)
	})

	test("is refused when it falls before the costs and rent begin, a month after the purchase", () => {
		const draft = homeDraft({ paying: "savings", saleDate: "2027-08-15" })
		expect(assetProblemsOf(draft, CHECK).get("saleDate")).toContain("a month after the purchase")
	})
})
