import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { overviewView } from "../../lib/view/overview/view"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import OverviewGrid from "../overview/OverviewGrid.svelte"
import WithdrawalsCard from "../overview/WithdrawalsCard.svelte"

describe("the Home card: spending in retirement", () => {
	test("states the first Rule year's amount, month and share, and links to the page", () => {
		const view = overviewView(DEMO)
		const body = render(WithdrawalsCard, { props: { scenario: view.withdrawals } }).body
		for (const word of [
			"Spending in retirement",
			"From Jun 2050",
			"3.99% of savings",
			"/yr",
			"/optimize/withdrawals/",
		]) {
			expect(body).toContain(word)
		}
		expect(body).toMatch(/title="862,256\.24"><span aria-hidden="true">862k/)
	})

	test("is not shown for a plan with no rule", () => {
		const other = overviewView({
			...DEMO,
			params: { ...DEMO.params, compare: null, scenarios: ["retire-early"] },
		})
		expect(render(OverviewGrid, { props: { view: other } }).body).not.toContain(
			"Spending in retirement",
		)
	})
})
