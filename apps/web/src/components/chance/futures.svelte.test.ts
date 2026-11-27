import { afterEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { setTestUrl } from "../../../scripts/svelte/app-stub"
import { snapshotLoader } from "../../client/browser"
import { editSession } from "../../client/edit.svelte.js"
import { pathReads } from "../../client/path-reads.svelte.js"
import { replaceSnapshot } from "../../client/snapshot.svelte"
import type { ProjectionChance, Read, Snapshot } from "../../lib/contract"
import { futuresViewOf } from "../../lib/view/chance/futures"
import { chanceWithOutcomes, pathFixture } from "../../lib/view/chance/futures.test-support"
import { runKey } from "../../lib/view/chance/path-state"
import { LOADING } from "../../lib/view/state"
import ChanceView from "./ChanceView.svelte"
import FuturesSection from "./FuturesSection.svelte"
import PathView from "./path/PathView.svelte"

const chance = chanceWithOutcomes()
const read = (data: ProjectionChance): Read<ProjectionChance> => ({
	argv: ["projection", "chance"],
	ok: true,
	data,
})
const accounts = {
	argv: [],
	ok: true,
	data: {
		accounts: [
			{ id: "acct-fund", name: "Fund" },
			{ id: "acct-bank", name: "Bank" },
		],
	},
}

function snapshot(paths: Record<string, unknown> = {}): Snapshot {
	return {
		params: { scenarios: ["base"] },
		reads: { chance: { base: read(chance) }, paths: { base: paths }, accounts },
	} as unknown as Snapshot
}
const stored = {
	"2": { argv: ["projection", "path", "--index=2"], ok: true, data: pathFixture(2) },
}

function pathPage(index: string, paths = stored, terms = "both"): string {
	// The page reads the ledger names from the Snapshot it shows.
	replaceSnapshot(snapshot(paths))
	return render(PathView, {
		props: { snapshot: snapshot(paths), scenario: "base", index, terms, onTerms: () => {} },
	}).body
}

afterEach(() => {
	snapshotLoader.replace(LOADING)
	editSession.token = null
	setTestUrl("http://127.0.0.1/")
})

describe("the Chance page's futures", () => {
	const page = () =>
		render(ChanceView, {
			props: {
				names: ["base"],
				chance: { base: read(chance) },
				scenario: "base",
				onScenario: () => {},
			},
		}).body

	test("lists the five cards, each linking to its future with the plan in the query", () => {
		const body = page()
		for (const title of [
			"A bad future (10th percentile)",
			"A typical future",
			"A good future",
			"The earliest run-out",
			"The deepest fall",
		]) {
			expect(body).toContain(title)
		}
		expect(body).toContain("/chance/path/?scenario=base&amp;index=2")
	})

	test("keeps the Demo's flag in each link, and lists a row for each of the first 25 futures with the count", () => {
		setTestUrl("http://127.0.0.1/chance/?demo=1")
		const body = page()
		expect(body).toContain("demo=1&amp;scenario=base&amp;index=4")
		expect(body).toContain("Showing 1 to 6 of 6 futures.")
		expect(body).toContain("Only the ones that ran out (2)")
		expect(body).toContain("Ran out in Mar 2028")
		expect(body).toContain("Lasted")
		expect(body).toContain("the year starting 31 Oct 2027")
	})

	test("shows the bar, the lowest point and the signed closing net worth of a path that fell below zero", () => {
		const body = page()
		expect(body).toContain("bg-destructive")
		expect(body).toContain("−5,200.25")
	})

	test("fits a phone: the table scrolls inside its own wrapper and the cards stack in one column", () => {
		const body = page()
		expect(body).toContain("max-w-full overflow-auto")
		expect(body).toContain("grid gap-3 sm:grid-cols-2 lg:grid-cols-3")
	})

	test("a read with no outcomes, as the Demo snapshot's, shows the page as it was and says a live dashboard opens each future", () => {
		const body = render(FuturesSection, {
			props: {
				futures: futuresViewOf({ ...chance, outcomes: undefined }),
				plan: "base",
				currency: "THB",
			},
		}).body
		expect(body).toContain("A live dashboard")
		expect(body).toContain("opens each one year by year")
		expect(body).not.toContain("Futures worth a look")
	})
})

describe("the path page", () => {
	test("opens a path the Snapshot read: Future n, one of paths, the run-out, the lowest point, a way back", () => {
		const body = pathPage("2")
		expect(body).toContain("Future 2, one of 6")
		expect(body).toContain("Ran out in Mar 2028")
		expect(body).toContain("in the year ending Oct 2028")
		expect(body).toContain("Back to Chance of success")
		expect(body).toContain('href="/chance/?scenario=base"')
	})

	test("draws net worth as bars with the run-out marker, and says it in words for a screen reader", () => {
		const body = pathPage("2")
		expect(body).toContain("Net worth at the close of each year of this future")
		expect(body).toContain("Ran out")
		expect(body).toContain("Ran out: 15 Mar 2028")
	})

	test("tables each year: age, each Account's return by name, income, spending and net worth", () => {
		const body = pathPage("2")
		for (const text of [
			"Fund return",
			"Bank return",
			"8.82%",
			"−1.20%",
			"Spending",
			"Income",
			"Net worth",
			"Net worth in today's money",
		]) {
			expect(body).toContain(text)
		}
		expect(body).toContain("Lowest point")
	})

	test("shows only the terms asked for in the table", () => {
		expect(pathPage("2", stored, "nominal")).not.toContain("in today's money</th>")
		expect(pathPage("2", stored, "real")).not.toContain(">Net worth</th>")
	})

	test("fits a phone: the table scrolls inside its own wrapper", () => {
		const body = pathPage("2")
		expect(body).toContain("max-w-full overflow-auto")
		expect(body).not.toContain("min-w-[")
	})

	test("in the Demo a future the Snapshot did not read says a live dashboard can open it", () => {
		const body = pathPage("3")
		expect(body).toContain("A live dashboard can open this future")
		expect(body).toContain("traj dashboard")
	})

	test("with a live dashboard it waits for the read, and shows a path read live", () => {
		editSession.token = "token"
		expect(pathPage("3")).toContain("Reading this future from traj")
		pathReads.entries = {
			[JSON.stringify(["base", 3])]: {
				run: runKey(chance),
				status: "done",
				read: { argv: ["live"], ok: true, data: pathFixture(3) },
			},
		}
		expect(pathPage("3")).toContain("Future 3, one of 6")
		pathReads.entries = {}
	})

	test("says why an index outside the run, or a path of another run, cannot be opened", () => {
		expect(pathPage("9")).toContain("numbered 0 to 5")
		const other = { "2": { argv: [], ok: true, data: pathFixture(2, { horizon: "2030-12-31" }) } }
		expect(pathPage("2", other)).toContain("different run")
	})
})
