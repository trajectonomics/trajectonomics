import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { setTestUrl } from "../../scripts/svelte/app-stub"
import { snapshotLoader } from "../client/browser"
import { replaceSnapshot } from "../client/snapshot.svelte"
import { openDemoSession, useSessionHooks } from "../client/what-if.test-support"
import { LOADING } from "../lib/view/state"
import { DEMO } from "../lib/view/what-if/fixtures.test-support"
import Home from "./+page.svelte"
import CashFlow from "./cash-flow/+page.svelte"
import Chance from "./chance/+page.svelte"
import Compare from "./compare/+page.svelte"
import Fi from "./fi/+page.svelte"
import Milestones from "./milestones/+page.svelte"
import NetWorth from "./net-worth/+page.svelte"
import Projection from "./projection/+page.svelte"
import Tax from "./tax/+page.svelte"

useSessionHooks()

// The Snapshot store is shared by every test file in the process, so it is put back as it was.
afterAll(() => {
	snapshotLoader.replace(LOADING)
	setTestUrl("http://127.0.0.1/")
})

beforeEach(() => replaceSnapshot(DEMO))

/**
 * Every route that draws a What-if lens, rendered as the route file is: the address bar names the plan, the
 * Snapshot is the Demo's, and a session is open on `base`. A page that forgot to pass its lens on would show
 * the baseline alone, and this fails it.
 */
const FIGURE_ROUTES = [
	{ name: "Home", path: "/", page: Home },
	{ name: "Projection", path: "/projection/", page: Projection },
	{ name: "Net worth", path: "/net-worth/", page: NetWorth },
	{ name: "Compare", path: "/compare/", page: Compare },
	{ name: "Cash flow", path: "/cash-flow/", page: CashFlow },
	{ name: "FI date", path: "/fi/", page: Fi },
	{ name: "Chance of success", path: "/chance/", page: Chance },
	{ name: "Milestones", path: "/milestones/", page: Milestones },
	{ name: "Tax", path: "/tax/", page: Tax },
] as const

describe("a figure page's route, with a session open", () => {
	for (const route of FIGURE_ROUTES) {
		test(`${route.name} shows the lens on the session's plan`, async () => {
			setTestUrl(`http://127.0.0.1${route.path}?demo=1&scenario=base`)
			await openDemoSession("base")
			const body = render(route.page).body
			expect(body).toContain("What-if on base")
		})

		test(`${route.name} shows no lens when the session is closed`, () => {
			setTestUrl(`http://127.0.0.1${route.path}?demo=1&scenario=base`)
			expect(render(route.page).body).not.toContain("What-if on")
		})
	}
})
