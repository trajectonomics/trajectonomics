import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"

import type { ProjectionRun, Read } from "../../lib/contract"
import { projectionRunFixture } from "../../lib/view/projection/fixtures.test-support"
import ProjectionView from "./ProjectionView.svelte"

const ARGV = ["projection", "run", "--scenario", "base", "--as-of", "2026-10-31", "--json"]

function okRead(run: ProjectionRun): Read<ProjectionRun> {
	return { argv: ARGV, ok: true, data: run }
}

function renderView(
	projections: Readonly<Record<string, Read<ProjectionRun>>>,
	scenario = "",
): string {
	return render(ProjectionView, {
		props: {
			names: Object.keys(projections),
			projections,
			scenario,
			onScenario: () => {},
			terms: "both",
			onTerms: () => {},
		},
	}).body
}

describe("ProjectionView", () => {
	test("offers every projected Scenario in the picker, and shows the first one", () => {
		const body = renderView({
			base: okRead(projectionRunFixture()),
			"retire-early": okRead(projectionRunFixture()),
		})
		expect(body).toContain('value="base"')
		expect(body).toContain('value="retire-early"')
		expect(body).toContain('name="scenario"')
	})

	test("shows the Scenario the address bar asks for, when it is one of the names", () => {
		const body = renderView(
			{
				base: okRead(projectionRunFixture()),
				"retire-early": okRead(projectionRunFixture({ runsOut: null })),
			},
			"retire-early",
		)
		expect(body).not.toContain("could not be read")
		expect(body).toMatch(/value="retire-early" checked=""/)
	})

	test("says there is no Scenario to project when none has a Read", () => {
		expect(renderView({})).toContain("No Scenario to project")
	})

	test("shows the CLI's error for a failed Read, with its command, and does not blank the picker", () => {
		const body = renderView({
			base: {
				argv: ARGV,
				ok: false,
				error: { code: "PROJECTION_REFUSED", exitCode: 3, message: "The engine refused." },
			},
		})
		expect(body).toContain("Projection of base could not be read")
		expect(body).toContain("The engine refused.")
		expect(body).toContain("PROJECTION_REFUSED")
		expect(body).toContain('name="scenario"')
	})
})
