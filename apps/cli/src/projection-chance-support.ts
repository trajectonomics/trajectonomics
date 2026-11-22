import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { ILLUSTRATIVE_RETURN_MODEL, ILLUSTRATIVE_SEED } from "./projection/chance-testing"
import type { ChanceView } from "./projection/chance-view"
import { baseFlags } from "./projection/testing"
import type { Captured } from "./test-support"

/** A chance result, parsed from its JSON and typed by the command's own schema. */
export function chanceBody(res: Captured): ChanceView {
	return JSON.parse(res.out) as ChanceView
}

/** Writes one Return model beside the data directory and returns its path. */
export function modelFile(
	home: string,
	model: unknown = ILLUSTRATIVE_RETURN_MODEL,
	name = "model.json",
): string {
	const path = join(home, name)
	writeFileSync(path, typeof model === "string" ? model : JSON.stringify(model))
	return path
}

/** The flags the chance leaf needs: one Scenario, the two dates, a model, a count and a seed. */
export function chanceFlags(
	model: string,
	options: { paths?: number | string; seed?: string } = {},
): string[] {
	return [
		...baseFlags(),
		"--return-model",
		model,
		"--paths",
		String(options.paths ?? 200),
		"--seed",
		options.seed ?? ILLUSTRATIVE_SEED,
	]
}
