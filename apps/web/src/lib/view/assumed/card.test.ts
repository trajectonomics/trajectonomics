import { describe, expect, test } from "bun:test"
import { assumedCard } from "./card"
import { DOCUMENT, filled, ONE_OF_EACH } from "./fixtures.test-support"
import { assumedGroups } from "./groups"

const card = (items: typeof ONE_OF_EACH, search = "") =>
	assumedCard(items, assumedGroups(items, DOCUMENT, search), search)

describe("Home's card of what a plan assumes", () => {
	test("is not drawn for a plan that assumes nothing", () => {
		expect(card([])).toBeNull()
	})

	test("counts the items, not the groups", () => {
		const items = [filled("accounts.cash.rate", 0), filled("accounts.fund.rate", 0)]
		expect(card(items)?.count).toBe(2)
		expect(card(items)?.sentences).toHaveLength(1)
	})

	test("says three sentences at most, the first groups' own", () => {
		const view = card(ONE_OF_EACH)
		expect(view?.count).toBe(7)
		expect(view?.sentences.map((sentence) => sentence.text)).toEqual([
			"Inflation is 0% a year",
			"grows at 1.5% a year",
			"charges 7% interest",
		])
	})

	test("links to the list on the Plan page, with the query before the fragment", () => {
		expect(card(ONE_OF_EACH)?.href).toBe("/projection/#assumed")
		expect(card(ONE_OF_EACH, "?scenario=trial")?.href).toBe("/projection/?scenario=trial#assumed")
	})
})
