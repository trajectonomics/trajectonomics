import { project } from "../engine/project"
import type { Fixture } from "../fixtures/fixture"
import type { Projection } from "../types"

/** The Projection of a fixture with the breakdown, and the routing statement, as the routing-statement parity case is run. */
export function projectedOf(fixture: Fixture): Projection {
	const result = project(fixture.baseline, fixture.scenario, fixture.timeline, {
		cashflowBreakdown: true,
		routing: true,
	})
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return result.projection
}
