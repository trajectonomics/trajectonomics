import { expect, type Page, test } from "@playwright/test"
import { openDemo } from "./demo"
import { measureMarkers } from "./marker-fit"

// A marker's label never crosses a dashed rule and never leaves the plot, on Plans at phone width, where
// the rules stand closest. The Demo's own Milestones are years apart, so each case serves the Demo snapshot
// with the base plan's Milestone dates moved. Only the real fonts show how wide the words are.
const CASES: readonly (readonly [string, readonly string[]])[] = [
	["1 month apart", ["2031-01-01", "2031-02-01"]],
	["6 months apart", ["2031-01-01", "2031-07-01"]],
	["18 months apart", ["2031-01-01", "2032-07-01"]],
	["3 years apart", ["2031-01-01", "2034-01-01"]],
	["at the left edge", ["2027-01-01", "2027-07-01"]],
	["at the right edge", ["2053-01-01", "2053-07-01"]],
	["three in half a year", ["2039-01-01", "2039-03-01", "2039-06-01"]],
]

interface Table {
	name: string
	rows: { id: string; reached: boolean; date: string | null }[]
}

interface DemoSnapshot {
	reads: { projections: { base: { data: { tables: Table[] } } } }
}

/** Serves the Demo snapshot with the base plan's first Milestones reached on `dates`, in the table's order. */
async function serveMoved(page: Page, dates: readonly string[]): Promise<void> {
	await page.route("**/demo/snapshot.json", async (route) => {
		const response = await route.fetch()
		const snapshot = (await response.json()) as DemoSnapshot
		const { tables } = snapshot.reads.projections.base.data
		const rows = tables.find((table) => table.name === "milestones")?.rows ?? []
		for (const [index, date] of dates.entries()) {
			Object.assign(rows[index] ?? {}, { reached: true, date })
		}
		await route.fulfill({ response, json: snapshot })
	})
}

for (const [name, dates] of CASES) {
	test(`Plans keeps marker labels off the rules at 360px, Milestones ${name}`, async ({ page }) => {
		await page.setViewportSize({ width: 360, height: 800 })
		await serveMoved(page, dates)
		await openDemo(page, "/plans/", { theme: "light" })
		const card = page.locator("article").filter({
			has: page.getByRole("heading", { name: "base", exact: true }),
		})
		await expect(card.locator("[data-marker-rule]")).toHaveCount(dates.length)
		await expect(card.locator("[data-marker-label]").first()).toBeVisible()
		// Every Milestone is named under the chart, whether or not its rule has room for words.
		await expect(
			card.getByRole("list", { name: "Milestones reached" }).getByRole("listitem"),
		).toHaveCount(dates.length)
		expect(await measureMarkers(page)).toEqual([])
	})
}

// The Plan's own chart at 360px is shorter than a card's, so its marker labels are measured by the same rules.
test("the Plan keeps marker labels off the rules at 360px, Milestones three in half a year", async ({
	page,
}) => {
	await page.setViewportSize({ width: 360, height: 800 })
	await serveMoved(page, ["2039-01-01", "2039-03-01", "2039-06-01"])
	await openDemo(page, "/projection/?scenario=base", { theme: "light" })
	const chart = page.getByRole("img", { name: "Net worth at the close of each year" })
	await expect(chart.locator("[data-marker-rule]")).toHaveCount(3)
	await expect(chart.locator("[data-marker-label]").first()).toBeVisible()
	expect(await measureMarkers(page)).toEqual([])
})
