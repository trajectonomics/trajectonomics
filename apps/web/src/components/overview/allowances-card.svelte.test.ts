import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { preferences } from "../../client/preferences.svelte.js"
import type { ProjectionAllowances } from "../../lib/contract"
import { GOLDEN_ALLOWANCES } from "../../lib/view/allowances/fixtures.test-support"
import { allowancesSummaryOf } from "../../lib/view/allowances/home"
import { NO_PEOPLE, snapshotPeople } from "../../lib/view/item-names"
import type { ScenarioView } from "../../lib/view/overview/scenario"
import { overviewView } from "../../lib/view/overview/view"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import AllowancesCard from "./AllowancesCard.svelte"
import OverviewGrid from "./OverviewGrid.svelte"

type Summary = ReturnType<typeof allowancesSummaryOf>

function card(summary: Summary, name = "base"): string {
	const scenario: ScenarioView<Summary> = {
		status: "ready",
		name,
		read: { argv: ["projection", "allowances"], ok: true, data: summary },
	}
	return render(AllowancesCard, { props: { scenario } }).body
}

/** The Demo's allowance read of a plan, or a thrown reason when it has none. */
function readOf(name: string): ProjectionAllowances {
	const read = DEMO.reads.allowances[name]
	if (read?.ok !== true) throw new Error(`the Demo has no ${name} allowance read`)
	return read.data
}

/** The Home card's summary of a Demo plan, named through its own household. */
function summaryOf(name: string): Summary {
	return allowancesSummaryOf(readOf(name), snapshotPeople(DEMO, [name])[name] ?? NO_PEOPLE)
}

describe("the Home card: tax you could still save this year", () => {
	test("states the saving and links to the Tax allowances page", () => {
		const body = card(allowancesSummaryOf(GOLDEN_ALLOWANCES))
		expect(body).toContain("Tax you could still save this year")
		expect(body).toContain("28.1k")
		expect(body).toContain('title="28,100.00"')
		expect(body).toContain("/optimize/allowances/")
	})

	test("names each Return of a separate filing and states both of the CLI's savings", () => {
		const body = card(summaryOf("separate"), "separate")
		expect(body).toContain(">You<")
		expect(body).toContain(">Your partner<")
		expect(body).toContain("84.9k")
		expect(body).toContain("4.6k")
		expect(body).toContain('title="84,950.00"')
	})

	test("still shows a partner's saving when the holder's Return saves nothing", () => {
		const data = readOf("separate")
		const holderSavesNothing: ProjectionAllowances = {
			...data,
			taxYears: data.taxYears.map((year) =>
				year.filer === "me" ? { ...year, saving: "0.00" } : year,
			),
		}
		const people = snapshotPeople(DEMO, ["separate"])["separate"] ?? NO_PEOPLE
		const body = card(allowancesSummaryOf(holderSavesNothing, people), "separate")
		expect(body).toContain("Tax you could still save this year")
		expect(body).toContain(">Your partner<")
		expect(body).toContain("4.6k")
		expect(body).toContain('title="4,600.00"')
	})

	test("a joint Return keeps one unnamed figure", () => {
		const body = card(summaryOf("joint"), "joint")
		expect(body).toContain("148k")
		expect(body).toContain('title="148,200.00"')
		expect(body).not.toContain("4.6k")
		expect(body).not.toContain(">You<")
	})

	test("is not shown when the year saves nothing more", () => {
		expect(card(null)).not.toContain("Tax you could still save")
	})

	test("is not shown for a Snapshot that holds no allowance read", () => {
		const bare = structuredClone(DEMO)
		bare.reads.allowances = {}
		const body = render(OverviewGrid, { props: { view: overviewView(bare) } }).body
		expect(body).not.toContain("Tax you could still save")
	})

	test("Hide amounts masks every Return's figure", () => {
		preferences.hidden = true
		let body = ""
		try {
			body = card(summaryOf("separate"), "separate")
		} finally {
			preferences.hidden = false
		}
		expect(body.match(/•••••/g)).toHaveLength(2)
		expect(body).not.toContain("84,950.00")
		expect(body).not.toContain("4,600.00")
	})
})
