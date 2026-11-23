import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { GOLDEN_ALLOWANCES } from "../../lib/view/allowances/fixtures.test-support"
import { allowancesSummaryOf } from "../../lib/view/allowances/home"
import type { ScenarioView } from "../../lib/view/overview/scenario"
import { overviewView } from "../../lib/view/overview/view"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import AllowancesCard from "./AllowancesCard.svelte"
import OverviewGrid from "./OverviewGrid.svelte"

type Summary = ReturnType<typeof allowancesSummaryOf>

function card(summary: Summary): string {
	const scenario: ScenarioView<Summary> = {
		status: "ready",
		name: "base",
		read: { argv: ["projection", "allowances"], ok: true, data: summary },
	}
	return render(AllowancesCard, { props: { scenario } }).body
}

describe("the Home card: tax you could still save this year", () => {
	test("states the saving and links to the Tax allowances page", () => {
		const body = card(allowancesSummaryOf(GOLDEN_ALLOWANCES))
		expect(body).toContain("Tax you could still save this year")
		expect(body).toContain("28,100.00")
		expect(body).toContain("/optimize/allowances/")
	})

	test("is not shown when the year saves nothing more", () => {
		expect(card(null)).not.toContain("Tax you could still save")
	})

	test("is not shown for a Snapshot that holds no allowance read", () => {
		const bare = structuredClone(DEMO)
		bare.reads.allowances = {}
		const body = render(OverviewGrid, { props: { view: overviewView(bare) } }).body
		expect(body).not.toContain("Tax you could still save")
	})
})
