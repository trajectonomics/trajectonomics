import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import type { Component } from "svelte"
import { render } from "svelte/server"
import { demoSnapshotText } from "../../scripts/demo-snapshot"
import { setTestUrl } from "../../scripts/svelte/app-stub"
import { snapshotLoader } from "../client/browser"
import { replaceSnapshot } from "../client/snapshot.svelte"
import { whatIfSession } from "../client/what-if.svelte"
import { HASH, useSessionHooks } from "../client/what-if.test-support"
import FigureChart from "../components/routing/FigureChart.svelte"
import WhatIfBar from "../components/what-if/WhatIfBar.svelte"
import { type Snapshot, snapshot as snapshotSchema } from "../lib/contract"
import { ROUTES } from "../lib/view/routes"
import { LOADING } from "../lib/view/state"
import { startWhatIf, withSet } from "../lib/what-if/session"

const DEMO: Snapshot = snapshotSchema.parse(JSON.parse(await demoSnapshotText()))

/** The attributes a person reads or hears: a link's and a chart's labels, a tooltip, and a field's placeholder. */
const ATTRIBUTE = /(?:aria-label|title|placeholder)="([^"]*)"/g

/** The text a person reads, without the tags, the code a page quotes, or the CLI's own strings shown as data. */
function pageText(body: string): string {
	return body
		.replace(/<code\b[\s\S]*?<\/code>/g, " ")
		.replace(/<(li|p|span|div)\b[^>]*\bdata-cli\b[^>]*>[\s\S]*?<\/\1>/g, " ")
		.replace(/<[^>]+>/g, " ")
}

/** The values of the attributes a person reads or hears. */
function pageAttributes(body: string): string {
	return [...body.matchAll(ATTRIBUTE)].map((match) => match[1] ?? "").join(" ")
}

/** Everything a page says to a person, in its text or in an attribute. */
function visible(body: string): string {
	return `${pageText(body)} ${pageAttributes(body)}`
}

/** What the guard forbids in one page: the CLI's word for a Plan, and an ISO date, each outside code or CLI text. */
function problemsOf(body: string): string[] {
	const words = visible(body)
	const found: string[] = []
	if (/scenario/i.test(words)) found.push("Scenario")
	if (/\b\d{4}-\d{2}(-\d{2})?\b/.test(words)) found.push("ISO date")
	return found
}

// biome-ignore lint/suspicious/noExplicitAny: a test renders pages whose props differ.
type AnyPage = Component<any>

/** Every page under `src/routes/`, so a page added there is guarded without an edit here. */
async function pagesOfRoutes(): Promise<readonly { path: string; page: AnyPage }[]> {
	const files = [...new Bun.Glob("**/+page.svelte").scanSync({ cwd: import.meta.dir })].sort()
	const pages = files.map(async (file) => {
		const dir = file.slice(0, -"/+page.svelte".length)
		const path = dir === "" ? "/" : `/${dir}/`
		const imported = (await import(`${import.meta.dir}/${file}`)) as { default: AnyPage }
		return { path, page: imported.default }
	})
	return Promise.all(pages)
}

const PAGES: readonly { path: string; page: AnyPage }[] = await pagesOfRoutes()

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

	test("prints its title once, with no intro paragraph under it", () => {
		for (const page of PAGES) {
			setTestUrl(`http://127.0.0.1${page.path}?demo=1&scenario=base`)
			const body = render(page.page).body
			expect(body.match(/<h1\b/g) ?? [], page.path).toHaveLength(1)
			const header = body.match(/<header\b[^>]*>([\s\S]*?)<\/header>/)?.[1] ?? ""
			expect(header, page.path).toContain("<h1")
			expect(header, page.path).not.toMatch(/<\/h1>(?:\s|<!--[\s\S]*?-->)*<p\b/)
		}
	})

	test("calls a Scenario a plan: the word appears nowhere outside code or the CLI's own text", () => {
		for (const page of PAGES) {
			setTestUrl(`http://127.0.0.1${page.path}?demo=1&scenario=base&index=0`)
			expect(visible(render(page.page).body), page.path).not.toMatch(/scenario/i)
		}
	})

	test("shows no ISO date outside an input, code or the CLI's own text", () => {
		for (const page of PAGES) {
			setTestUrl(`http://127.0.0.1${page.path}?demo=1&scenario=base&index=0`)
			expect(visible(render(page.page).body), page.path).not.toMatch(/\b\d{4}-\d{2}(-\d{2})?\b/)
		}
	})

	test("prints a locked Account's date as a date, outside code and the CLI's own text", () => {
		const next = structuredClone(DEMO)
		const read = next.reads.documents["base"]
		if (read?.ok !== true) throw new Error("the Demo reads its base plan")
		const account = read.data.scenario.document.accounts.find((one) => one.kind === "asset")
		if (account === undefined) throw new Error("the Demo's base plan has an asset")
		account.lockedUntil = "2031-06-30"
		replaceSnapshot(next)
		const page = PAGES.find((one) => one.path === "/assets-and-debts/")
		if (page === undefined) throw new Error("no page renders /assets-and-debts/")
		setTestUrl("http://127.0.0.1/assets-and-debts/?demo=1&scenario=base")
		const body = render(page.page).body
		expect(body).toContain("30 Jun 2031")
		expect(body).not.toContain("2031-06-30")
		expect(problemsOf(body)).toEqual([])
	})

	test("links a page of the navigation with words that name it", () => {
		const plans = PAGES.find((one) => one.path === "/plans/")
		if (plans === undefined) throw new Error("no page renders /plans/")
		setTestUrl("http://127.0.0.1/plans/?demo=1&scenario=base")
		const body = render(plans.page).body
		for (const match of body.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)) {
			const href = match[1] ?? ""
			const path = href.split(/[?#]/)[0] ?? ""
			const route = ROUTES.find((one) => one.path === path)
			if (route === undefined) continue
			expect(visible(match[2] ?? ""), href).toContain(route.label)
		}
	})
})

describe("the What-if bar", () => {
	useSessionHooks()

	test("prints a Flow's start date as a date, outside the CLI's own text", () => {
		replaceSnapshot(DEMO)
		whatIfSession.whatIf = withSet(startWhatIf("base", HASH), "flows.rent.start", "2027-03-01")
		const body = render(WhatIfBar, { props: {} }).body
		expect(visible(body)).toContain("1 Mar 2027")
		expect(problemsOf(body)).toEqual([])
	})
})

describe("the guard", () => {
	test("finds a Scenario in an aria-label, even with an ISO date beside it", () => {
		expect(problemsOf('<p aria-label="The two Scenarios on 2026-10-31"></p>')).toEqual([
			"Scenario",
			"ISO date",
		])
	})

	test("finds a lowercase scenario in an intro", () => {
		expect(problemsOf("<p>Every scenario has its own plan.</p>")).toEqual(["Scenario"])
	})

	test("finds a page-written date in a note that used to be marked as the CLI's", () => {
		const body = render(FigureChart, {
			props: {
				label: "Money moved, by year",
				figure: {
					series: [{ name: "Rent", points: [] }],
					notes: ["2026-10-31: nothing moved."],
				},
				empty: "No money moved in this run.",
			},
		}).body
		expect(problemsOf(body)).toEqual(["ISO date"])
	})
})
