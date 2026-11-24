import type { ChanceView } from "./projection/chance-view"
import type { ProjectionPathView } from "./projection/path-view"
import { projection, projectionHome } from "./projection/testing"
import { chanceBody, chanceFlags, modelFile } from "./projection-chance-support"
import type { Captured } from "./test-support"

/** Three annual roll-ups from the fixture's As-of. */
export const THREE_YEARS = "2029-03-30"

/** A data directory with a Return model file in it, and the flags of a chance of `paths` paths over `horizon`. */
export async function outcomesRun(
	paths: number,
	options: { scenario?: string; horizon?: string } = {},
): Promise<{ home: string; flags: string[] }> {
	const home = await projectionHome()
	const flags = [
		...chanceFlags(modelFile(home), { paths }),
		"--scenario",
		options.scenario ?? "base",
		"--horizon",
		options.horizon ?? THREE_YEARS,
	]
	return { home, flags }
}

/** `projection chance --outcomes` over the flags, parsed. */
export async function chanceWithOutcomes(home: string, flags: string[]): Promise<ChanceView> {
	const res = await projection(home, ["chance", ...flags, "--outcomes"])
	if (res.code !== 0) throw new Error(res.err)
	return chanceBody(res)
}

/** `projection path` over the same flags at one index. */
export function pathAt(
	home: string,
	flags: string[],
	index: number,
	extra: string[] = [],
): Promise<Captured> {
	return projection(home, ["path", ...flags, "--index", String(index), ...extra])
}

/** A path result, parsed. */
export function pathBody(res: Captured): ProjectionPathView {
	if (res.code !== 0) throw new Error(res.err)
	return JSON.parse(res.out) as ProjectionPathView
}
