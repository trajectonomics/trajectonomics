// The answer to a path read, `POST /reread` with `{ "path": { plan, index } }`: one `projection path`, run with the
// chance's own flags and answered as data, and nothing else. The held Snapshot, the served body and the parameters are
// left alone ([web ADR 0020](../docs/adr/0020-the-chance-page-lists-every-future-and-opens-one-year-by-year.md)).
import { type ProjectionChance, projectionPath, type Snapshot } from "../src/lib/contract"
import type { PlanParams } from "../src/lib/snapshot"
import { type PathRequest, pathRead, sameRun } from "../src/lib/snapshot/paths"
import { runPlanned } from "./run-planned"
import type { RunContext } from "./run-traj"
import { failure, refused } from "./serve-edit-answer"
import { json } from "./serve-respond"

/** The chance read the Snapshot holds for a plan, when it holds a good one. */
function heldChance(held: Snapshot, plan: string): ProjectionChance | null {
	const read = held.reads.chance[plan]
	return read?.ok === true ? read.data : null
}

/**
 * Reads one Market path. Refused, with the sentence a person reads, when the request cannot name a path of the chance the
 * Snapshot holds: the plan is not one of its plans, no chance is stated, the parameters' paths or seed are no longer the
 * held chance's own, or the index is outside that chance's `paths`. The read is
 * then checked against that chance, and a replay of another run is an error, never an answer.
 */
export async function answerPath(
	request: PathRequest,
	params: PlanParams,
	held: Snapshot | null,
	traj: RunContext,
	records: readonly unknown[],
): Promise<Response> {
	const { plan, index } = request
	if (held === null) return refused(409, "not_ready", "The Dashboard has no Snapshot yet.")
	if (params.chance === null) {
		return refused(
			400,
			"no_chance",
			"This Dashboard states no Market paths, so no future can be opened.",
		)
	}
	if (!held.params.scenarios.includes(plan)) {
		return refused(400, "unknown_plan", `The Snapshot holds no plan named ${plan}.`)
	}
	const chance = heldChance(held, plan)
	const planned = pathRead(params, plan, index)
	if (chance === null || planned === null) {
		return refused(
			409,
			"no_chance_read",
			`The Snapshot holds no chance read for ${plan}. Reload the Dashboard.`,
		)
	}
	// The future is a replay of the chance on screen, so it is named by that chance's own paths and seed, not the parameters'.
	const { seed, paths } = chance.definition
	if (params.chance.seed !== seed || params.chance.paths !== paths) {
		return refused(
			409,
			"chance_changed",
			`The chance on screen drew ${paths} Market paths from seed ${seed}, and the Dashboard now holds other inputs, so that future would be of another run. Reload the Dashboard.`,
		)
	}
	if (index >= paths) {
		return refused(
			400,
			"invalid_path_index",
			`The chance on screen has ${paths} paths, numbered 0 to ${paths - 1}.`,
		)
	}
	const path = await runPlanned(traj, planned, projectionPath, records)
	if (path.ok && !sameRun(chance, path.data)) {
		return failure(200, {
			code: "path_of_another_run",
			exitCode: 1,
			message:
				"That future is of a different run than the chance on screen: the plan or the chance inputs changed. Reload the Dashboard.",
		})
	}
	return json(200, JSON.stringify({ ok: true, path }))
}
