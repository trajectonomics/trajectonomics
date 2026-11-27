import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { setTestUrl } from "../../scripts/svelte/app-stub"
import { snapshotLoader } from "../client/browser"
import { replaceSnapshot } from "../client/snapshot.svelte"
import { LOADING } from "../lib/view/state"
import { DEMO } from "../lib/view/what-if/fixtures.test-support"
import AssetsAndDebts from "./assets-and-debts/+page.svelte"
import Expenses from "./expenses/+page.svelte"
import Household from "./household/+page.svelte"
import Income from "./income/+page.svelte"
import Plan from "./projection/+page.svelte"
import Years from "./projection/years/+page.svelte"

// The Snapshot store and the address are shared by every test file in the process, so they are put back.
afterAll(() => {
	snapshotLoader.replace(LOADING)
	setTestUrl("http://127.0.0.1/")
})

beforeEach(() => replaceSnapshot(DEMO))

describe("the Plan page", () => {
	test("opens on its chart, with the people row and the figures, and no household card or year table", () => {
		setTestUrl("http://127.0.0.1/projection/?demo=1&scenario=base")
		const body = render(Plan).body
		expect(body).toContain("<h1")
		expect(body).toContain("Plan")
		expect(body).toMatch(/href="\/household\//)
		expect(body).toContain("You")
		expect(body).toContain("37")
		expect(body).toContain("Stop working")
		expect(body).toContain("At the end, 2053")
		expect(body).toContain("Chance of success")
		expect(body).toContain('role="img"')
		expect(body).toContain(">You 37<")
		expect(body).not.toContain("Pin a date")
		expect(body).not.toContain("Account holder")
		expect(body).not.toContain("Opening net worth")
	})

	test("offers the year table, where money goes and the plan comparison below it", () => {
		setTestUrl("http://127.0.0.1/projection/?demo=1&scenario=base")
		const body = render(Plan).body
		expect(body).toMatch(/href="\/projection\/years\//)
		expect(body).toMatch(/href="\/routing\//)
		expect(body).toMatch(/href="\/compare\//)
	})

	test("holds the item tabs, its strip above a panel of the tab the address names", () => {
		setTestUrl("http://127.0.0.1/projection/?demo=1&scenario=base&items=expenses")
		const body = render(Plan).body
		expect(body).toContain('role="tablist"')
		expect(body).toContain('role="tabpanel"')
		expect(body).toMatch(/role="tab"[^>]*aria-selected="true"[^>]*>Expenses/)
		expect(body).toMatch(/role="tab"[^>]*aria-selected="false"[^>]*>Income/)
	})
})

describe("the Plan's full item pages", () => {
	test("each one links back to the Plan and lists its items as full cards", () => {
		const pages = [Income, Expenses, AssetsAndDebts]
		for (const page of pages) {
			setTestUrl("http://127.0.0.1/income/?demo=1&scenario=base")
			const body = render(page).body
			expect(body, "the way back to the Plan").toContain("← Plan")
			expect(body).toContain("<dt")
		}
	})
})

describe("the pages the Plan opens", () => {
	test("the household page holds the household card with its people and its edit forms path", () => {
		setTestUrl("http://127.0.0.1/household/?demo=1&scenario=base")
		const body = render(Household).body
		expect(body).toContain("Account holder")
		expect(body).toContain("Life expectancy")
		expect(body).toContain("← Plan")
		expect(body).not.toContain("Opening net worth")
	})

	test("the year page holds the annual table exactly and a way back to the Plan", () => {
		setTestUrl("http://127.0.0.1/projection/years/?demo=1&scenario=base")
		const body = render(Years).body
		expect(body).toContain("Opening net worth")
		expect(body).toContain("Closing net worth")
		expect(body).toContain("← Plan")
		expect(body).not.toContain("Pin a date")
	})
})
