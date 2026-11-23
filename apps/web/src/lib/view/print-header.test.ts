import { describe, expect, test } from "bun:test"
import type { Snapshot } from "../contract"
import { failedRead } from "../snapshot/fixtures.test-support"
import { printHeading, printHeadingText } from "./print-header"
import { projectionRunFixture } from "./projection/fixtures.test-support"
import type { SnapshotState } from "./state"

function ready(projection: Snapshot["reads"]["projections"][string]): SnapshotState {
	const snapshot = {
		params: { asOf: "2026-09-30" },
		reads: { projections: { base: projection } },
	} as unknown as Snapshot
	return { status: "ready", url: "/snapshot.json", snapshot }
}

describe("printHeading", () => {
	test("names the plan, the projection's As-of date and the terms in words", () => {
		const run = projectionRunFixture()
		const state = ready({ argv: [], ok: true, data: run })
		expect(printHeading(state, "base", "real", false)).toEqual({
			plan: "base",
			asOf: run.asOf,
			terms: "Real, in As-of terms",
			whatIf: false,
		})
	})

	test("falls back to the Snapshot's As-of date when the plan's projection failed", () => {
		const heading = printHeading(ready(failedRead(["projection"])), "base", "nominal", true)
		expect(heading?.asOf).toBe("2026-09-30")
		expect(heading && printHeadingText(heading)).toBe(
			"base · As of 2026-09-30 · Nominal · What-if session",
		)
	})

	test("is null until the Snapshot is ready and a plan is selected", () => {
		expect(printHeading({ status: "loading" }, "base", "both", false)).toBeNull()
		expect(printHeading(ready(failedRead(["projection"])), "", "both", false)).toBeNull()
	})
})
