import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
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
import { ComparePanel } from "./ComparePanel"

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
	return renderToStaticMarkup(
		<ComparePanel compare={read} projections={projections} terms={terms} onTerms={() => {}} />,
	)
}

describe("ComparePanel", () => {
	test("with no comparison, it says a comparison needs two Scenarios and shows the flag", () => {
		const html = panel({}, null)
		expect(html).toContain("A comparison needs two Scenarios")
		expect(html).toContain("--compare A B")
	})

	test("A is solid and B dashed, and the difference column is labelled B minus A", () => {
		const html = panel({ base: ok(runA), "retire-early": ok(runB) })
		expect(html).toContain("A, solid")
		expect(html).toContain("B, dashed")
		expect(html).toContain("Difference, B minus A")
		expect(html).toContain("Content hash eba036341234")
		expect(html).toContain('role="img"')
	})

	test("the figures are the CLI's: a zero delta reads No change and an unstated one is a dash", () => {
		const html = panel({ base: ok(runA), "retire-early": ok(runB) })
		expect(html).toContain("No change")
		expect(html).toContain("One FI date is not reachable")
		expect(html).toContain("Binding: insufficientMoney")
		expect(html).toContain("Not reached")
	})

	test("a failed Projection Read leaves the chart out, says why, and keeps the table", () => {
		const html = panel({ base: ok(runA), "retire-early": failed("The Scenario is empty.") })
		expect(html).toContain("The chart is not drawn")
		expect(html).toContain(
			"The Projection of retire-early could not be read: The Scenario is empty.",
		)
		expect(html).not.toContain('role="img"')
		expect(html).toContain("Difference, B minus A")
	})

	test("a failed compare Read says the comparison could not be read", () => {
		const html = panel({}, failed("No such Scenario."))
		expect(html).toContain("The comparison could not be read")
		expect(html).toContain("No such Scenario.")
	})
})
