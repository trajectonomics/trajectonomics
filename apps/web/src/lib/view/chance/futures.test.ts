import { describe, expect, test } from "bun:test"
import { chanceFixture } from "./fixtures.test-support"
import { futuresViewOf, PAGE_SIZE, pageOfFutures } from "./futures"
import { chanceWithOutcomes } from "./futures.test-support"

const view = futuresViewOf(chanceWithOutcomes())

describe("futuresViewOf", () => {
	test("is null for a read made without --outcomes, as the Demo snapshot's is", () => {
		expect(futuresViewOf(chanceFixture())).toBeNull()
	})

	test("words each path: the month it ran out, the roll-up it was lowest in, and whether it closed below zero", () => {
		const futures = view?.futures ?? []
		expect(futures).toHaveLength(6)
		expect(futures[2]).toMatchObject({
			index: 2,
			ranOut: "Mar 2028",
			lowestFrom: "Oct 2027",
			below: false,
		})
		expect(futures[4]).toMatchObject({ index: 4, below: true, closing: "-5200.25" })
		expect(futures[0]).toMatchObject({ ranOut: null, lowestFrom: "Oct 2028" })
		expect(view?.ranOut).toBe(2)
	})

	test("places the longest bar full and the rest in proportion, below zero too", () => {
		const bars = (view?.futures ?? []).map((future) => Math.round(future.bar))
		expect(bars).toEqual([0, 0, 0, 100, 0, 0])
		expect(view?.futures[4]?.bar).toBeGreaterThan(0)
	})

	test("makes one card for each of the five picks, in the issue's words, each naming its path", () => {
		expect(view?.cards.map((card) => [card.title, card.future.index])).toEqual([
			["A bad future (10th percentile)", 4],
			["A typical future", 0],
			["A good future", 3],
			["The earliest run-out", 2],
			["The deepest fall", 4],
		])
	})

	test("leaves out the earliest run-out when no path ran out", () => {
		const none = futuresViewOf(
			chanceWithOutcomes({
				representative: { p10: 4, p50: 0, p90: 3, earliestRunsOut: null, lowest: 4 },
			}),
		)
		expect(none?.cards.map((card) => card.title)).not.toContain("The earliest run-out")
		expect(none?.cards).toHaveLength(4)
	})
})

describe("pageOfFutures", () => {
	const futures = view?.futures ?? []
	const indexes = (page: ReturnType<typeof pageOfFutures>) => page.rows.map((row) => row.index)

	test("sorts by closing net worth, worst first, comparing the strings and breaking a tie by index", () => {
		const page = pageOfFutures(futures, { order: "worst", onlyRanOut: false, page: 1 })
		// -5200.25, then the two zeros (0.00 and "-0.00") by index, then 75.10, 900.50, 1,250,000.00
		expect(indexes(page)).toEqual([4, 1, 2, 5, 0, 3])
	})

	test("sorts best first with the same tie rule", () => {
		const page = pageOfFutures(futures, { order: "best", onlyRanOut: false, page: 1 })
		expect(indexes(page)).toEqual([3, 0, 5, 1, 2, 4])
	})

	test("keeps only the ones that ran out, and counts them", () => {
		const page = pageOfFutures(futures, { order: "worst", onlyRanOut: true, page: 1 })
		expect(indexes(page)).toEqual([4, 2])
		expect(page).toMatchObject({ total: 2, from: 1, to: 2, pages: 1 })
	})

	test("pages 25 at a time, clamps a page out of range, and says 0 to 0 for no rows", () => {
		const many = Array.from({ length: 60 }, (_, index) => ({
			...(futures[0] as (typeof futures)[number]),
			index,
			closing: `${index}.00`,
		}))
		const second = pageOfFutures(many, { order: "worst", onlyRanOut: false, page: 2 })
		expect(PAGE_SIZE).toBe(25)
		expect(second).toMatchObject({ page: 2, pages: 3, from: 26, to: 50, total: 60 })
		expect(indexes(second)[0]).toBe(25)
		expect(pageOfFutures(many, { order: "worst", onlyRanOut: false, page: 9 }).page).toBe(3)
		const none = pageOfFutures(many, { order: "worst", onlyRanOut: true, page: 1 })
		expect(none).toMatchObject({ total: 0, from: 0, to: 0, pages: 1 })
	})
})
