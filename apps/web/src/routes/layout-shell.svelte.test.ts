import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { createRawSnippet } from "svelte"
import { render } from "svelte/server"
import { setTestUrl } from "../../scripts/svelte/app-stub"
import { snapshotLoader } from "../client/browser"
import { shellPanels } from "../client/shell.svelte"
import { replaceSnapshot } from "../client/snapshot.svelte"
import { chooseScenario } from "../lib/view/plan"
import { ledgerWith } from "../lib/view/plans/fixtures.test-support"
import { routeAt } from "../lib/view/routes"
import { LOADING } from "../lib/view/state"
import Layout from "./+layout.svelte"

const SNAPSHOT = ledgerWith({ base: {}, "retire-early": { main: true } }, ["base", "retire-early"])
const page = createRawSnippet(() => ({ render: () => "<p>the page</p>" }))

const renderLayout = () => render(Layout, { props: { children: page } }).body

/** The plan the switcher marks as the one the pages show. */
function chosenPlan(body: string): string | undefined {
	return body.match(/aria-current="true"[^>]*>\s*([^<]+?)\s*</)?.[1]
}

/** The page's label in the top bar. */
function topBarTitle(body: string): string | undefined {
	const header = body.match(/<header class="print:hidden[^"]*"[^>]*>[\s\S]*?<\/header>/)?.[0]
	return header?.match(/<p class="min-w-0[^"]*">([^<]*)<\/p>/)?.[1]
}

/** The button that opens the menu drawer, with its attributes. */
function menuButton(body: string): string {
	return body.match(/<button[^>]*aria-controls="page-menu"[^>]*>/)?.[0] ?? ""
}

beforeEach(() => {
	replaceSnapshot(SNAPSHOT)
	shellPanels.closeAll()
})

afterAll(() => {
	snapshotLoader.replace(LOADING)
	shellPanels.closeAll()
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

	test("names the page with the label routeAt gives its path", () => {
		setTestUrl("http://127.0.0.1/net-worth/")
		expect(topBarTitle(renderLayout())).toBe(routeAt("/net-worth/")?.label)
	})

	test("says on the menu button whether the menu drawer is open", () => {
		setTestUrl("http://127.0.0.1/net-worth/")
		expect(menuButton(renderLayout())).toContain('aria-expanded="false"')
		shellPanels.openMenu()
		expect(menuButton(renderLayout())).toContain('aria-expanded="true"')
	})
})
