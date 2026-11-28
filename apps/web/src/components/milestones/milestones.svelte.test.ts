import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { MILESTONE_ROWS, withMilestones } from "../../lib/view/milestones/fixtures.test-support"
import { projectionRunFixture } from "../../lib/view/projection/fixtures.test-support"
import MilestonesBody from "./MilestonesBody.svelte"
import MilestonesView from "./MilestonesView.svelte"

const ARGV = ["projection", "run", "--scenario", "base", "--json"]

function renderBody(run: ReturnType<typeof projectionRunFixture>): string {
	return render(MilestonesBody, { props: { run, argv: ARGV, terms: "both", onTerms: () => {} } })
		.body
}

describe("MilestonesBody", () => {
	test("lists the reached Milestones in date order, each with its date", () => {
		const body = renderBody(withMilestones(MILESTONE_ROWS))
		expect(body).toContain('<time datetime="2026-12-31">31 Dec 2026</time>')
		expect(body).toContain('<time datetime="2027-10-31">31 Oct 2027</time>')
		expect(body.indexOf("first-year")).toBeLessThan(body.indexOf("second-year"))
	})

	test("lists the unreached Milestones apart, labelled with the horizon when the plan did not run out", () => {
		const body = renderBody(withMilestones(MILESTONE_ROWS))
		expect(body).toContain("Unreached")
		expect(body).toContain("never")
		expect(body).toContain('Not reached by <time datetime="2028-12-31">31 Dec 2028</time>')
	})

	test("labels the unreached Milestones with the run-out date when the plan ran out", () => {
		const body = renderBody(
			withMilestones(MILESTONE_ROWS, { runsOut: { date: "2028-04-01", unmet: "70359.24" } }),
		)
		expect(body).toContain('Not reached by <time datetime="2028-04-01">1 Apr 2028</time>')
	})

	test("draws a mark on the chart for each reached Milestone, and repeats it in a list below", () => {
		const body = renderBody(withMilestones(MILESTONE_ROWS))
		expect(body).toContain("<title>first-year</title>")
		// The page's own timeline shows the Milestones, so the chart's list is for a screen reader only.
		expect(body).toContain('<ul class="space-y-1 text-xs sr-only">')
		expect(body).not.toContain("not-sr-only")
		expect(body).toMatch(
			/data-item="first-year"[^>]*>first-year<\/code>(<!--.*?-->)*: reached on 31 Dec 2026/,
		)
		expect(body).not.toContain("never: reached")
	})

	test("says the plan declares no milestones when its projection has no milestones table", () => {
		const body = renderBody(projectionRunFixture())
		expect(body).toContain("This plan declares no milestones")
		expect(body).not.toContain("Unreached")
	})

	test("says no milestone is reached when every one is unreached", () => {
		const body = renderBody(withMilestones([{ id: "never", reached: false, date: null }]))
		expect(body).toContain("No milestone reached")
		expect(body).toContain("Not reached by")
	})
})

describe("MilestonesView", () => {
	test("says there is no plan to show when the Snapshot holds no projection", () => {
		const body = render(MilestonesView, {
			props: {
				names: [],
				projections: {},
				chances: {},
				scenario: "",
				asOf: "2026-10-31",
				terms: "both",
				onTerms: () => {},
			},
		}).body
		expect(body).toContain("No plan to show milestones for")
	})

	test("shows the chosen Scenario's milestones, and the first one when the request names none", () => {
		const read = { argv: ARGV, ok: true as const, data: withMilestones(MILESTONE_ROWS) }
		const body = render(MilestonesView, {
			props: {
				names: ["base"],
				projections: { base: read },
				chances: {},
				scenario: "",
				asOf: "2026-10-31",
				terms: "both",
				onTerms: () => {},
			},
		}).body
		expect(body).toContain("Not reached by")
		expect(body).toContain("first-year")
	})
})
