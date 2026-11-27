import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { demoSnapshotText } from "../../scripts/demo-snapshot"
import { setTestUrl } from "../../scripts/svelte/app-stub"
import { snapshotLoader } from "../client/browser"
import { replaceSnapshot } from "../client/snapshot.svelte"
import { whatIfSession } from "../client/what-if.svelte"
import { HASH, useSessionHooks } from "../client/what-if.test-support"
import SeriesPicker from "../components/charts/SeriesPicker.svelte"
import FigureChart from "../components/routing/FigureChart.svelte"
import ProjectionWhatIf from "../components/what-if/ProjectionWhatIf.svelte"
import TaxWhatIf from "../components/what-if/TaxWhatIf.svelte"
import WhatIfBar from "../components/what-if/WhatIfBar.svelte"
import { type Snapshot, snapshot as snapshotSchema } from "../lib/contract"
import { NO_PEOPLE } from "../lib/view/item-names"
import { LOADING } from "../lib/view/state"
import { demoLens, statedCompare } from "../lib/view/what-if/fixtures.test-support"
import { startWhatIf, withSet } from "../lib/what-if/session"
import Layout from "./+layout.svelte"
import {
	pageSnippet,
	pagesOfRoutes,
	pageText,
	problemsOf,
	type RoutePage,
} from "./words.test-support"

const DEMO: Snapshot = snapshotSchema.parse(JSON.parse(await demoSnapshotText()))

const PAGES: readonly RoutePage[] = await pagesOfRoutes()

// The Snapshot store and the address are shared by every test file in the process, so they are put back.
afterAll(() => {
	snapshotLoader.replace(LOADING)
	setTestUrl("http://127.0.0.1/")
})

describe("a page of the Demo Snapshot", () => {
	beforeEach(() => replaceSnapshot(DEMO))

	test("says plain words in place of the engine's, on every page", () => {
		const found = PAGES.flatMap((page) => {
			setTestUrl(`http://127.0.0.1${page.path}?demo=1&scenario=base&index=0`)
			return problemsOf(render(page.page).body).map((word) => `${page.path}: ${word}`)
		})
		expect(found).toEqual([])
	})

	test("says plain words in the shell too: the top bar, the status line and the navigation", () => {
		const found = PAGES.flatMap((page) => {
			setTestUrl(`http://127.0.0.1${page.path}?demo=1&scenario=base&index=0`)
			const shell = render(Layout, { props: { children: pageSnippet } }).body
			return problemsOf(shell).map((word) => `${page.path}: ${word}`)
		})
		expect(found).toEqual([])
	})

	test("the Plan says plain words with each of its item tabs selected", () => {
		const page = PAGES.find((one) => one.path === "/projection/")
		if (page === undefined) throw new Error("no page renders /projection/")
		for (const items of ["income", "expenses", "assets", "milestones"]) {
			setTestUrl(`http://127.0.0.1/projection/?demo=1&scenario=base&items=${items}`)
			expect(problemsOf(render(page.page).body), items).toEqual([])
		}
	})

	test("the Demo's six pages say the new words, and a card is one link with no Open text", () => {
		const words: Readonly<Record<string, readonly string[]>> = {
			"/": ["Today's money", "Money lasts to the end of the plan", "Tax for", "Due", "chance"],
			"/projection/": ["Future money", "Today's money", "Stop working", "Year by year"],
			"/chance/": ["chance", "Lasts to"],
			"/tax/": ["Tax for", "Due"],
			"/fi/": ["Future money"],
			"/estate/": ["Future money", "Today's money"],
		}
		for (const [path, expected] of Object.entries(words)) {
			const page = PAGES.find((one) => one.path === path)
			if (page === undefined) throw new Error(`no page renders ${path}`)
			setTestUrl(`http://127.0.0.1${path}?demo=1&scenario=base&index=0`)
			const text = pageText(render(page.page).body)
			for (const word of expected) expect(text, `${path}: ${word}`).toContain(word)
		}
		const overview = PAGES.find((one) => one.path === "/")
		if (overview === undefined) throw new Error("no page renders /")
		setTestUrl("http://127.0.0.1/?demo=1&scenario=base")
		expect(render(overview.page).body).not.toContain(">Open<")
	})
})

describe("the What-if session", () => {
	useSessionHooks()

	test("says plain words in its bar and its figure panels", () => {
		replaceSnapshot(DEMO)
		whatIfSession.whatIf = withSet(startWhatIf("base", HASH), "flows.rent.start", "2027-03-01")
		const lens = demoLens(statedCompare())
		const bodies = [
			render(WhatIfBar, { props: {} }).body,
			render(ProjectionWhatIf, {
				props: { lens, baseline: null, terms: "nominal", keys: ["closingNetWorth", "levy"] },
			}).body,
			render(TaxWhatIf, { props: { lens, people: NO_PEOPLE } }).body,
		]
		expect(problemsOf(bodies.join(""))).toEqual([])
	})

	test("says future money in the series picker's names", () => {
		const body = render(SeriesPicker, {
			props: {
				groups: [
					{
						id: "money",
						title: "Money in and out",
						entries: [{ id: "income", name: "Income", available: true, reason: null, real: false }],
						notes: [],
					},
				],
				chosen: [],
				names: new Map<string, string>(),
				accounts: new Map<string, string>(),
				onToggle: () => undefined,
			},
		}).body
		expect(body).toContain("(future money only)")
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

	test("finds every engine word put back in a page's own text", () => {
		const said: readonly [string, string][] = [
			["193 of 200 seeded Market paths", "seeded"],
			["Real net worth, in As-of terms", "As-of terms"],
			["Nominal net worth", "Nominal"],
			["Loading the Snapshot.", "Snapshot"],
			["Levy th-2026-pit", "Levy "],
			["The Levy's change", "Levy "],
			["a success share of 96.50%", "success share"],
			["Plan base", "Plan base"],
		]
		for (const [text, name] of said) {
			expect(problemsOf(`<p>${text}</p>`), text).toContain(name)
		}
	})

	test("leaves the CLI's own words alone, in code and in data-cli text", () => {
		expect(
			problemsOf(
				"<p data-cli>The plan holds to 2053-12-31 on 193 of 200 seeded Market paths.</p><code>Levy th-2026-pit</code>",
			),
		).toEqual([])
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
