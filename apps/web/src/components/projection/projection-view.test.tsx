import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"

import type { ProjectionRun, Read } from "../../lib/contract"
import { projectionRunFixture } from "../../lib/view/projection/fixtures.test-support"
import { ProjectionView } from "./ProjectionView"

const ARGV = ["projection", "run", "--scenario", "base", "--as-of", "2026-10-31", "--json"]

function okRead(run: ProjectionRun): Read<ProjectionRun> {
	return { argv: ARGV, ok: true, data: run }
}

describe("ProjectionView", () => {
	test("offers every projected Scenario in the picker, and shows the first one", () => {
		const html = renderToStaticMarkup(
			<ProjectionView
				projections={{
					base: okRead(projectionRunFixture()),
					"retire-early": okRead(projectionRunFixture()),
				}}
			/>,
		)
		expect(html).toContain('value="base"')
		expect(html).toContain('value="retire-early"')
		expect(html).toContain('name="scenario"')
	})

	test("says there is no Scenario to project when none has a Read", () => {
		const html = renderToStaticMarkup(<ProjectionView projections={{}} />)
		expect(html).toContain("No Scenario to project")
	})

	test("shows the CLI's error for a failed Read, with its command, and does not blank the picker", () => {
		const html = renderToStaticMarkup(
			<ProjectionView
				projections={{
					base: {
						argv: ARGV,
						ok: false,
						error: { code: "PROJECTION_REFUSED", exitCode: 3, message: "The engine refused." },
					},
				}}
			/>,
		)
		expect(html).toContain("Projection of base could not be read")
		expect(html).toContain("The engine refused.")
		expect(html).toContain("PROJECTION_REFUSED")
		expect(html).toContain('name="scenario"')
	})
})
