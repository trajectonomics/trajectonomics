import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { preferences } from "../../client/preferences.svelte.js"
import type { ProjectionCompare, ProjectionRun, Read } from "../../lib/contract"
import { SIDE_A, SIDE_B } from "../../lib/view/compare/fixtures.test-support"
import {
	annualRow,
	compareOf,
	DEFAULT_DELTAS,
	failed,
	ok,
	projectionRun,
} from "../../lib/view/compare/projection.test-support"
import { insideDetails, outsideDetails } from "../../lib/view/details.test-support"
import ComparePanel from "./ComparePanel.svelte"

const compare: Read<ProjectionCompare> = ok(compareOf(SIDE_A, SIDE_B, DEFAULT_DELTAS))

const runA = projectionRun({
	tables: [
		{
			name: "annual",
			count: 2,
			rows: [
				annualRow(0, "1000.00", "900.00", "2027-10-30"),
				annualRow(1, "2000.00", "1800.00", "2028-10-30"),
			],
		},
	],
})
const runB = projectionRun({
	scenario: { ...projectionRun().scenario, name: "retire-early" },
	tables: [{ name: "annual", count: 1, rows: [annualRow(0, "500.00", "450.00", "2027-10-30")] }],
})

function panel(
	projections: Readonly<Record<string, Read<ProjectionRun>>>,
	read: Read<ProjectionCompare> | null = compare,
	terms: "nominal" | "real" = "nominal",
): string {
	return render(ComparePanel, {
		props: { compare: read, projections, terms, onTerms: () => {} },
	}).body
}

describe("ComparePanel", () => {
	// The commands under Details are a Display setting, off by default.
	beforeEach(() => {
		preferences.showCommands = true
	})
	afterEach(() => {
		preferences.showCommands = false
	})

	test("with no comparison, it says a comparison needs two plans and shows the flag", () => {
		const body = panel({}, null)
		expect(body).toContain("A comparison needs two plans")
		expect(body).toContain("--compare A --compare B")
	})

	test("A is solid and B dashed, and the difference column is labelled B minus A", () => {
		const body = panel({ base: ok(runA), "retire-early": ok(runB) })
		expect(body).toContain("A, solid")
		expect(body).toContain("B, dashed")
		expect(body).toContain("Difference, B minus A")
		expect(body).toContain('role="img"')
	})

	test("keeps the command and both content hashes in Details", () => {
		const body = panel({ base: ok(runA), "retire-early": ok(runB) })
		expect(outsideDetails(body)).not.toContain("Content hash")
		expect(outsideDetails(body)).not.toContain("jcs1:sha256:")
		const details = insideDetails(body)
		expect(details).toContain("traj projection compare --json")
		expect(details).toContain("Content hash, A")
		expect(details).toContain("jcs1:sha256:eba036341234ffff0000")
		expect(details).toContain("Effective hash, B")
		expect(details).toContain("jcs1:sha256:96b45010aaaabbbbcccc")
	})

	test("the figures are the CLI's: a zero delta reads No change and an unstated one is a dash", () => {
		const body = panel({ base: ok(runA), "retire-early": ok(runB) })
		expect(body).toContain("No change")
		expect(body).toContain("One FI date is not reachable")
		expect(body).toContain("Binding: insufficientMoney")
		expect(body).toContain("Not reached")
	})

	test("a failed Projection Read leaves the chart out, says why, and keeps the table", () => {
		const body = panel({ base: ok(runA), "retire-early": failed("The Scenario is empty.") })
		expect(body).toContain("The chart is not drawn")
		expect(body).toContain(
			"The Projection of retire-early could not be read: The Scenario is empty.",
		)
		expect(body).not.toContain('role="img"')
		expect(body).toContain("Difference, B minus A")
	})

	test("a failed compare Read says the comparison could not be read", () => {
		const body = panel({}, failed("No such Scenario."))
		expect(body).toContain("The comparison could not be read")
		expect(body).toContain("No such Scenario.")
	})
})
