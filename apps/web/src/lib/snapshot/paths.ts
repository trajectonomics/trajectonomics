/**
 * The reads of one Market path ([web ADR 0020](../../../docs/adr/0020-the-chance-page-lists-every-future-and-opens-one-year-by-year.md)):
 * the argv of `projection path`, the indexes the Snapshot reads in advance, the request the page may send for any other
 * index, and the check that a replay belongs to the chance on screen. Pure: no I/O.
 */
import { z } from "zod"
import {
	errorBody,
	type ProjectionChance,
	type ProjectionPath,
	projectionPath,
	type Read,
	readOf,
} from "../contract"
import { planNameShapeError } from "../edit/name"
import type { PlanParams } from "./params"
import { type PlannedRead, plainRead } from "./planned"
import { projectionFlags, scenarioFlag } from "./stage-two-projections"

/**
 * The argv of one replay: `projection chance`'s flags, so the replay is of the chance read, and `--index`, which names
 * the path under the seed. Null when the parameters state no chance inputs. The Carry-in goes on standard input.
 */
export function pathRead(params: PlanParams, plan: string, index: number): PlannedRead | null {
	const chance = params.chance
	if (chance === null) return null
	const argv = [
		"projection",
		"path",
		scenarioFlag(plan),
		...projectionFlags(params),
		`--return-model=${chance.returnModel}`,
		`--paths=${chance.paths}`,
		`--seed=${chance.seed}`,
		`--index=${index}`,
		"--json",
	]
	return params.carryIn ? { argv, carryInFor: [plan] } : plainRead(argv)
}

/**
 * The path indexes the Snapshot reads in advance: the five `representative` ones of a chance read, each once, in the CLI's
 * order. None when the read failed or was made without `--outcomes`.
 */
export function representativeIndexes(chance: Read<ProjectionChance> | undefined): number[] {
	if (chance?.ok !== true || chance.data.representative === undefined) return []
	const { p10, p50, p90, earliestRunsOut, lowest } = chance.data.representative
	const picks = [p10, p50, p90, earliestRunsOut, lowest]
	return picks.filter(
		(index, position): index is number => index !== null && picks.indexOf(index) === position,
	)
}

/** The index a path is named by in a Snapshot's `paths`: JSON keys are text. */
export function pathKey(index: number): string {
	return String(index)
}

/** What a page asks for to read one path live: the plan, and the path's index in the run (`POST /reread`, web ADR 0020). */
export const pathRequest = z.strictObject({
	plan: z
		.string()
		.min(1)
		.refine((name) => planNameShapeError(name) === null, "a plan name the Dashboard may send"),
	index: z.number().int().min(0).max(9999),
})

/** One request to read a path. */
export type PathRequest = z.infer<typeof pathRequest>

/** The run a chance read is of: the model, seed and paths, and the plan as projected, as `projection path` echoes them. */
export type RunOf = Pick<ProjectionChance, "definition" | "scenario" | "asOf" | "horizon">

/**
 * Whether a replay is of the chance read it is shown beside: the same run (`definition`, whose model hash tells two files of one id apart), the same plan content
 * (`scenario.effectiveContentHash`, which a terminal edit changes) and the same dates. A path of another run would show a
 * future the chance never drew.
 */
export function sameRun(chance: RunOf, path: Pick<ProjectionPath, keyof RunOf>): boolean {
	return (
		chance.definition.modelId === path.definition.modelId &&
		chance.definition.modelHash === path.definition.modelHash &&
		chance.definition.seed === path.definition.seed &&
		chance.definition.paths === path.definition.paths &&
		chance.scenario.effectiveContentHash === path.scenario.effectiveContentHash &&
		chance.asOf === path.asOf &&
		chance.horizon === path.horizon
	)
}

/** What the server answers to a path read: the read of that one path (its own error, if the CLI refused it), or a refusal. */
export const pathAnswer = z.discriminatedUnion("ok", [
	z.strictObject({ ok: z.literal(true), path: readOf(projectionPath) }),
	z.strictObject({ ok: z.literal(false), error: errorBody }),
])

/** One path answer, parsed. */
export type PathAnswer = z.infer<typeof pathAnswer>
