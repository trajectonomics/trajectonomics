// The answer to POST /what-if: the four reads of a what-if, run one at a time with the Overrides, and answered as
// data. Nothing here writes: each read is a read leaf ([web ADR 0010](../docs/adr/0010-the-what-if-session-reads-through-traj-on-loopback.md)).
import { z } from "zod"
import type { PlanParams } from "../src/lib/snapshot"
import { whatIfReads } from "../src/lib/what-if/argv"
import { runPlanned } from "./run-stages"
import type { RunContext } from "./run-traj"
import { failure, readWhatIf } from "./serve-edit-answer"
import { json } from "./serve-respond"

/** Reads the body, then runs the what-if's four reads against the Plan's parameters and Carry-in records. */
export async function answerWhatIf(
	request: Request,
	params: PlanParams,
	traj: RunContext,
	records: readonly unknown[],
): Promise<Response> {
	const read = await readWhatIf(request)
	if (!read.ok) return failure(400, read.error)
	const plan = whatIfReads(params, read.whatIf)
	const run = (planned: typeof plan.projection) => runPlanned(traj, planned, z.unknown(), records)
	const projection = await run(plan.projection)
	const fi = await run(plan.fi)
	const compare = await run(plan.compare)
	const chance = plan.chance === null ? null : await run(plan.chance)
	return json(200, JSON.stringify({ ok: true, reads: { projection, fi, compare, chance } }))
}
