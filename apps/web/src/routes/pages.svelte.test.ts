import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import type { Component } from "svelte"
import { render } from "svelte/server"
import { demoSnapshotText } from "../../scripts/demo-snapshot"
import { setTestUrl } from "../../scripts/svelte/app-stub"
import { snapshotLoader } from "../client/browser"
import { replaceSnapshot } from "../client/snapshot.svelte"
import { type Snapshot, snapshot as snapshotSchema } from "../lib/contract"
import { ROUTES } from "../lib/view/routes"
import { LOADING } from "../lib/view/state"
import Home from "./+page.svelte"
import AssetsAndDebts from "./assets-and-debts/+page.svelte"
import CashFlow from "./cash-flow/+page.svelte"
import Chance from "./chance/+page.svelte"
import ChancePath from "./chance/path/+page.svelte"
import Compare from "./compare/+page.svelte"
import Estate from "./estate/+page.svelte"
import Expenses from "./expenses/+page.svelte"
import Fi from "./fi/+page.svelte"
import Health from "./health/+page.svelte"
import Income from "./income/+page.svelte"
import Ledger from "./ledger/+page.svelte"
import Milestones from "./milestones/+page.svelte"
import NetWorth from "./net-worth/+page.svelte"
import Allowances from "./optimize/allowances/+page.svelte"
import Withdrawals from "./optimize/withdrawals/+page.svelte"
import Plans from "./plans/+page.svelte"
import Projection from "./projection/+page.svelte"
import Reports from "./reports/+page.svelte"
import Routing from "./routing/+page.svelte"
import Assumptions from "./settings/assumptions/+page.svelte"
import TaxProfile from "./settings/tax/+page.svelte"
import Tax from "./tax/+page.svelte"

const DEMO: Snapshot = snapshotSchema.parse(JSON.parse(await demoSnapshotText()))

/** Every page of the Demo Snapshot, in navigation order with the two pages the navigation opens from them. */
// biome-ignore lint/suspicious/noExplicitAny: a test renders pages whose props differ.
const PAGES: readonly { path: string; page: Component<any> }[] = [
	{ path: "/", page: Home },
	{ path: "/net-worth/", page: NetWorth },
	{ path: "/projection/", page: Projection },
	{ path: "/milestones/", page: Milestones },
	{ path: "/income/", page: Income },
	{ path: "/expenses/", page: Expenses },
	{ path: "/assets-and-debts/", page: AssetsAndDebts },
	{ path: "/fi/", page: Fi },
	{ path: "/compare/", page: Compare },
	{ path: "/reports/", page: Reports },
	{ path: "/optimize/allowances/", page: Allowances },
	{ path: "/optimize/withdrawals/", page: Withdrawals },
	{ path: "/estate/", page: Estate },
	{ path: "/cash-flow/", page: CashFlow },
	{ path: "/routing/", page: Routing },
	{ path: "/chance/", page: Chance },
	{ path: "/tax/", page: Tax },
	{ path: "/ledger/", page: Ledger },
	{ path: "/health/", page: Health },
	{ path: "/settings/tax/", page: TaxProfile },
	{ path: "/settings/assumptions/", page: Assumptions },
	{ path: "/plans/", page: Plans },
	{ path: "/chance/path/", page: ChancePath },
]

/** The text a person reads, without the tags, the code a page quotes, or the CLI's own sentences shown as data. */
function visible(body: string): string {
	return body
		.replace(/<code\b[\s\S]*?<\/code>/g, " ")
		.replace(/<(li|p|span|div)\b[^>]*\bdata-cli\b[^>]*>[\s\S]*?<\/\1>/g, " ")
		.replace(/<[^>]+>/g, " ")
}

function h1Of(body: string): string | undefined {
	const match = body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)
	return match?.[1]
		?.replace(/<[^>]+>/g, "")
		.replaceAll("&amp;", "&")
		.trim()
}

// The Snapshot store and the address are shared by every test file in the process, so they are put back.
afterAll(() => {
	snapshotLoader.replace(LOADING)
	setTestUrl("http://127.0.0.1/")
})

describe("a page of the Demo Snapshot", () => {
	beforeEach(() => replaceSnapshot(DEMO))

	test("heads the page a navigation item opens with that item's label", () => {
		for (const route of ROUTES) {
			const page = PAGES.find((one) => one.path === route.path)
			if (page === undefined) throw new Error(`no page renders ${route.path}`)
			setTestUrl(`http://127.0.0.1${route.path}?demo=1&scenario=base`)
			expect(h1Of(render(page.page).body), route.path).toBe(route.label)
		}
	})

	test("calls a Scenario a plan: the word appears nowhere outside code or the CLI's own text", () => {
		for (const page of PAGES) {
			setTestUrl(`http://127.0.0.1${page.path}?demo=1&scenario=base&index=0`)
			expect(visible(render(page.page).body), page.path).not.toContain("Scenario")
		}
	})

	test("shows no ISO date outside an input, code or the CLI's own text", () => {
		for (const page of PAGES) {
			setTestUrl(`http://127.0.0.1${page.path}?demo=1&scenario=base&index=0`)
			expect(visible(render(page.page).body), page.path).not.toMatch(/\b\d{4}-\d{2}(-\d{2})?\b/)
		}
	})
})
