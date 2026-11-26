import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { pathFixture } from "../../lib/view/chance/futures.test-support"
import { MILESTONE_ROWS, withMilestones } from "../../lib/view/milestones/fixtures.test-support"
import PathChart from "../chance/path/PathChart.svelte"
import NetWorthChart from "../projection/NetWorthChart.svelte"

// A rule's label may be shortened or left out, and a phone has no hover, so a chart with markers lists them
// below itself there. From the `sm` width the list is for a screen reader only.
const LIST = '<ul class="space-y-1 text-xs not-sr-only sm:sr-only">'

describe("the list under a chart with markers", () => {
	test("shows at phone width under the Overview's net worth chart", () => {
		const run = withMilestones(MILESTONE_ROWS)
		const body = render(NetWorthChart, { props: { run, terms: "both", onTerms: () => {} } }).body
		expect(body).toContain(LIST)
	})

	test("shows at phone width under a future's chart, with the Milestones and the run-out", () => {
		const { tables } = withMilestones(MILESTONE_ROWS)
		const path = pathFixture(2, { tables })
		const body = render(PathChart, { props: { path, terms: "both", onTerms: () => {} } }).body
		const list = body.slice(body.indexOf(LIST))
		expect(body.indexOf(LIST)).toBeGreaterThan(body.indexOf("</svg>"))
		expect(list).toContain('data-item="first-year"')
		expect(list).toContain("15 Mar 2028")
	})
})
