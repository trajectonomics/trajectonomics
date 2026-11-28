import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { demoSnapshotText } from "../../scripts/demo-snapshot"
import { setTestUrl } from "../../scripts/svelte/app-stub"
import { snapshotLoader } from "../client/browser"
import { replaceSnapshot } from "../client/snapshot.svelte"
import { whatIfSession } from "../client/what-if.svelte"
import { HASH, useSessionHooks } from "../client/what-if.test-support"
import WhatIfBar from "../components/what-if/WhatIfBar.svelte"
import { milestoneLabel, type Snapshot, snapshot as snapshotSchema } from "../lib/contract"
import { greetingOf } from "../lib/view/overview/greeting"
import { scenarioNames } from "../lib/view/plan"
import { ROUTES } from "../lib/view/routes"
import { LOADING } from "../lib/view/state"
import { startWhatIf, withSet } from "../lib/what-if/session"
import { pagesOfRoutes, problemsOf, type RoutePage, visible } from "./words.test-support"

const DEMO: Snapshot = snapshotSchema.parse(JSON.parse(await demoSnapshotText()))

/** Every Flow and Milestone id a Demo plan states, so a page that prints one in code fails. */
function demoItemIds(snapshot: Snapshot): ReadonlySet<string> {
	const scenarios = Object.values(snapshot.reads.documents).flatMap((read) =>
		read.ok ? [read.data.scenario] : [],
	)
	const flows = scenarios.flatMap((scenario) => scenario.document.flows.map((flow) => flow.id))
	const milestones = scenarios.flatMap((scenario) =>
		(scenario.document.milestones ?? []).flatMap((one) => {
			const parsed = milestoneLabel.safeParse(one)
			return parsed.success ? [parsed.data.id] : []
		}),
	)
	return new Set([...flows, ...milestones])
}

/** The text of every `<code>` element in a page's body. */
function codeTexts(body: string): string[] {
	return [...body.matchAll(/<code\b[^>]*>([\s\S]*?)<\/code>/g)].map((match) =>
		(match[1] ?? "").replace(/<[^>]+>/g, "").trim(),
	)
}

const PAGES: readonly RoutePage[] = await pagesOfRoutes()

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

	test("heads the page a navigation item opens with that item's label, and Home with its greeting", () => {
		for (const route of ROUTES) {
			const page = PAGES.find((one) => one.path === route.path)
			if (page === undefined) throw new Error(`no page renders ${route.path}`)
			setTestUrl(`http://127.0.0.1${route.path}?demo=1&scenario=base`)
			const expected = route.path === "/" ? greetingOf(DEMO) : route.label
			expect(h1Of(render(page.page).body), route.path).toBe(expected)
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

	test("shows no Flow or Milestone id in code on any plan, because the Demo states a label for each", () => {
		const ids = demoItemIds(DEMO)
		expect(ids.size).toBeGreaterThan(0)
		const plans = scenarioNames({ status: "ready", url: "/demo/snapshot.json", snapshot: DEMO })
		expect(plans.length).toBeGreaterThan(1)
		for (const plan of plans) {
			for (const page of PAGES) {
				setTestUrl(`http://127.0.0.1${page.path}?demo=1&scenario=${plan}&index=0`)
				const shown = codeTexts(render(page.page).body).filter((text) => ids.has(text))
				expect(shown, `${page.path} on ${plan}`).toEqual([])
			}
		}
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
