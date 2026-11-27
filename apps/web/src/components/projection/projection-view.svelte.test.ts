import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { snapshotLoader } from "../../client/browser"
import { replaceSnapshot } from "../../client/snapshot.svelte"
import type { Fi, ProjectionChance, ProjectionRun, Read } from "../../lib/contract"
import { chanceFixture } from "../../lib/view/chance/fixtures.test-support"
import { fiFixture, REACHABLE } from "../../lib/view/fi/fixtures.test-support"
import { householdOf } from "../../lib/view/item-names"
import { annualRowsOf } from "../../lib/view/projection/annual"
import { projectionRunFixture } from "../../lib/view/projection/fixtures.test-support"
import { LOADING } from "../../lib/view/state"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import ProjectionView from "./ProjectionView.svelte"

const ARGV = ["projection", "run", "--scenario", "base", "--as-of", "2026-10-31", "--json"]

function okRead<T>(data: T): Read<T> {
	return { argv: ARGV, ok: true, data }
}

const FI = fiFixture(REACHABLE)
const CHANCE = chanceFixture()

function renderView(options: {
	projections?: Readonly<Record<string, Read<ProjectionRun>>>
	scenario?: string
	household?: ReturnType<typeof householdOf>
	fi?: Read<Fi> | undefined
	chance?: Read<ProjectionChance> | undefined
	editable?: boolean
}): string {
	const projections = options.projections ?? { base: okRead(projectionRunFixture()) }
	return render(ProjectionView, {
		props: {
			snapshot: DEMO,
			names: Object.keys(projections),
			projections,
			scenario: options.scenario ?? "",
			household: options.household === undefined ? householdOf(DEMO, "base") : options.household,
			fi: "fi" in options ? options.fi : okRead(FI),
			chance: "chance" in options ? options.chance : okRead(CHANCE),
			editable: options.editable ?? false,
			terms: "both",
			onTerms: () => {},
			chart: "",
			onChart: () => {},
			items: "income",
			onItems: () => {},
		},
	}).body
}

beforeEach(() => replaceSnapshot(DEMO))

afterAll(() => {
	snapshotLoader.replace(LOADING)
})

describe("ProjectionView, the Plan", () => {
	test("opens on the three figures and the chart, with no plan picker", () => {
		const body = renderView({})
		expect(body).toContain("Stop working")
		expect(body).toContain("Mar 2041")
		expect(body).toContain("At the end, 2028")
		expect(body).toContain("1.55M")
		expect(body).toContain("Chance of success")
		expect(body).toContain("87%")
		expect(body).toContain('role="img"')
		expect(body).not.toContain('name="scenario"')
	})

	test("links each figure to its page, and offers the pages below it", () => {
		const body = renderView({})
		for (const href of ["/fi/", "/projection/years/", "/chance/"]) {
			expect(body).toContain(`href="${href}"`)
		}
		for (const link of ["Year by year →", "Where money goes →", "Compare plans →"]) {
			expect(body).toContain(link)
		}
	})

	test("shows each person of the household with the age of the first year, and the household link", () => {
		const run = projectionRunFixture()
		const rows = annualRowsOf(run)
		const [first, ...rest] = rows
		if (first === undefined) throw new Error("the fixture has a year")
		const withAges = {
			...run,
			tables: [
				{
					name: "annual" as const,
					count: rows.length,
					rows: [
						{
							...first,
							ages: [
								{ person: "me", age: 37 },
								{ person: "partner", age: 35 },
								{ person: "mali", age: 1 },
							],
						},
						...rest,
					],
				},
			],
		}
		const body = renderView({ projections: { base: okRead(withAges) } })
		expect(body).toContain("You")
		expect(body).toContain("37")
		expect(body).toContain("Your partner")
		expect(body).toContain("35")
		expect(body).toContain("Child")
		expect(body).toContain('href="/household/"')
		expect(body).toContain("Household<!----></a>")
	})

	test("offers Add people without a household only when Edits show, and nothing in the Demo", () => {
		expect(renderView({ household: null, editable: true })).toContain("Add people")
		const demo = renderView({ household: null, editable: false })
		expect(demo).not.toContain("Add people")
		expect(demo).not.toContain(">Household</a>")
	})

	test("leaves a figure out when its Read states none", () => {
		const body = renderView({ fi: undefined, chance: undefined })
		expect(body).not.toContain("Stop working")
		expect(body).not.toContain("Chance of success")
		expect(body).toContain("At the end, 2028")
	})

	test("says there is no plan to project when none has a Read", () => {
		expect(renderView({ projections: {} })).toContain("No plan to project")
	})

	test("shows the CLI's error for a failed Read, with its command, and still shows the people and the plan's pages", () => {
		const body = renderView({
			projections: {
				base: {
					argv: ARGV,
					ok: false,
					error: { code: "PROJECTION_REFUSED", exitCode: 3, message: "The engine refused." },
				},
			},
		})
		expect(body).toContain("Projection of base could not be read")
		expect(body).toContain("The engine refused.")
		expect(body).toContain("PROJECTION_REFUSED")
		expect(body).toContain('href="/household/"')
		expect(body).toContain("Year by year →")
	})
})
