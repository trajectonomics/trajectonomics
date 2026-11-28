import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { createRawSnippet } from "svelte"
import { render } from "svelte/server"
import { clearTestError, setTestError, setTestUrl } from "../../scripts/svelte/app-stub"
import { snapshotLoader } from "../client/browser"
import { shellPanels } from "../client/shell.svelte"
import { replaceSnapshot } from "../client/snapshot.svelte"
import { chooseScenario } from "../lib/view/plan"
import { ledgerWith } from "../lib/view/plans/fixtures.test-support"
import { documentTitle, ROUTES, routeAt } from "../lib/view/routes"
import { LOADING } from "../lib/view/state"
import Layout from "./+layout.svelte"

const SNAPSHOT = ledgerWith({ base: {}, "retire-early": { main: true } }, ["base", "retire-early"])
const page = createRawSnippet(() => ({ render: () => "<p>the page</p>" }))

const renderLayout = () => render(Layout, { props: { children: page } }).body

/** The plan the switcher's top-bar button names as the one the pages show. */
function chosenPlan(body: string): string | undefined {
	return topBar(body).match(/aria-label="Plan: ([^"]+)\. Change plan"/)?.[1]
}

/** The top bar's markup. */
function topBar(body: string): string {
	return body.match(/<header class="print:hidden[^"]*"[^>]*>[\s\S]*?<\/header>/)?.[0] ?? ""
}

/** The button that opens the menu drawer, with its attributes. */
function menuButton(body: string): string {
	return body.match(/<button[^>]*aria-controls="page-menu"[^>]*>/)?.[0] ?? ""
}

beforeEach(() => {
	replaceSnapshot(SNAPSHOT)
	shellPanels.closeMenu()
	clearTestError()
})

afterAll(() => {
	snapshotLoader.replace(LOADING)
	shellPanels.closeMenu()
	clearTestError()
	setTestUrl("http://127.0.0.1/")
})

describe("the shell's wiring", () => {
	test("shows the plan chooseScenario picks, falling back when the address names one the Snapshot lacks", () => {
		setTestUrl("http://127.0.0.1/net-worth/?scenario=not-a-plan")
		const expected = chooseScenario(SNAPSHOT.params.scenarios, "not-a-plan")
		expect(expected).toBe("retire-early")
		expect(chosenPlan(renderLayout())).toBe(expected ?? "")
	})

	test("shows the plan the address names when the Snapshot holds it", () => {
		setTestUrl("http://127.0.0.1/net-worth/?scenario=base")
		expect(chosenPlan(renderLayout())).toBe("base")
	})

	test("leaves the page's label to its h1: the top bar does not print it", () => {
		setTestUrl("http://127.0.0.1/net-worth/")
		const label = routeAt("/net-worth/")?.label ?? ""
		expect(label).not.toBe("")
		expect(topBar(renderLayout())).not.toContain(`>${label}<`)
	})

	test("holds only the menu button and the plan switcher", () => {
		setTestUrl("http://127.0.0.1/net-worth/")
		const bar = topBar(renderLayout())
		expect(bar).toContain('aria-label="Open the menu"')
		expect(bar).toContain('aria-label="Plan: ')
		for (const gone of [
			'aria-label="Hide amounts"',
			'aria-label="Display options"',
			"Figures as of",
		]) {
			expect(bar, gone).not.toContain(gone)
		}
	})

	test("says on the menu button whether the menu drawer is open", () => {
		setTestUrl("http://127.0.0.1/net-worth/")
		expect(menuButton(renderLayout())).toContain('aria-expanded="false"')
		shellPanels.openMenu()
		expect(menuButton(renderLayout())).toContain('aria-expanded="true"')
	})
})

describe("the layout's title", () => {
	test("gives every page's tab the page's heading and the product's name", () => {
		for (const route of ROUTES) {
			setTestUrl(`http://127.0.0.1${route.path}`)
			const { head } = render(Layout, { props: { children: page } })
			expect(head, route.path).toContain(`<title>${documentTitle(route.label)}</title>`)
		}
	})

	test("names an error page by its status, not the page's heading", () => {
		setTestUrl("http://127.0.0.1/nowhere/")
		setTestError(404, "Not Found")
		const { head } = render(Layout, { props: { children: page } })
		expect(head).toContain("<title>Page not found · Trajectonomics</title>")
	})
})
