/** TEST-ONLY: projects a test Setup with Milestones added to its Scenario. */
import { project } from "../engine/project"
import { makeFixture, type Setup } from "../engine/test-helpers"
import type { Milestone, Projection, ProjectionProblem } from "../types"

/** The Projection of a Setup with Milestones; throws when the inputs are refused. */
export function milestoned(setup: Setup, milestones: readonly Milestone[]): Projection {
	const result = projectWith(setup, milestones)
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return result.projection
}

/** The Projection result of a Setup with Milestones, for tests that expect a refusal. */
export function milestonedResult(
	setup: Setup,
	milestones: readonly Milestone[],
):
	| { readonly ok: true; readonly projection: Projection }
	| { readonly ok: false; readonly problems: readonly ProjectionProblem[] } {
	return projectWith(setup, milestones)
}

function projectWith(setup: Setup, milestones: readonly Milestone[]) {
	const { baseline, scenario, timeline } = makeFixture(setup)
	return project(baseline, { ...scenario, milestones }, timeline)
}

/** The fire date of a Milestone in a Projection, or `undefined` when it did not fire. */
export function firedOn(projection: Projection, id: string): string | undefined {
	const result = projection.milestones?.find((item) => item.id === id)
	return result?.reached === true ? result.date : undefined
}
