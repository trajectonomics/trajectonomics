import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import type { CatalogueGroup } from "../../lib/view/charts/catalogue"
import SeriesPicker from "./SeriesPicker.svelte"

/** The id of the expense Flow `id` in `category`, as `resolve-flows.ts` keys it. */
function cashSeries(id: string, category: string | null): string {
	return `cash:${JSON.stringify(["expense", id, null, category])}`
}

const LISTED = cashSeries("rent", null)
const REMOVED = cashSeries("old", "rent")
const GROUPS: readonly CatalogueGroup[] = [
	{
		id: "money",
		title: "Money in and out",
		entries: [
			{ id: LISTED, name: "Expense: old (rent)", available: true, reason: null, real: false },
		],
		notes: [],
	},
]

describe("the series picker", () => {
	test("a removed series the plan does not list never reads like a listed one", () => {
		const body = render(SeriesPicker, {
			props: {
				groups: GROUPS,
				chosen: [REMOVED],
				names: new Map<string, string>(),
				accounts: new Map<string, string>(),
				onToggle: () => {},
			},
		}).body
		expect(body).toContain("Not in this plan")
		expect(body).toContain("Expense: old (rent) (2)")
	})
})
