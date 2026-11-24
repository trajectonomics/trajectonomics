import type { PlanInput } from "./params"

/** The chance reads' inputs, once the three flags have all held: one `projection chance` per Scenario. */
export type ChancePlan = { returnModel: string; paths: number; seed: string }

/** The rules the three chance flags break: all three or none, and each value one the CLI takes. */
export type ChanceErrorCode =
	| "chance_needs_all_three"
	| "invalid_return_model"
	| "invalid_paths"
	| "invalid_seed"

const MESSAGES: Record<ChanceErrorCode, string> = {
	chance_needs_all_three:
		"--paths and --seed go together (--return-model is optional: the plan's own model by default); pass both, or none.",
	invalid_return_model: "--return-model must be a file path, not standard input.",
	invalid_paths: "--paths must be a whole number from 1 to 10,000.",
	invalid_seed: "--seed must be sixteen lower-case hex digits.",
}

/** The seed the chance reads draw from: sixteen lower-case hex digits, as the CLI states it. */
const SEED = /^[0-9a-f]{16}$/

/** The first rule the chance flags break, with its code and sentence, or null when they hold. */
export function checkChance(input: PlanInput): { code: ChanceErrorCode; message: string } | null {
	const given = [input.returnModel, input.paths, input.seed].filter((value) => value !== null)
	if (given.length === 0) return null
	const fail = (code: ChanceErrorCode) => ({ code, message: MESSAGES[code] })
	if (given.length !== 3) return fail("chance_needs_all_three")
	if (input.returnModel === "-" || input.returnModel === "") return fail("invalid_return_model")
	const paths = input.paths ?? 0
	if (!Number.isInteger(paths) || paths < 1 || paths > 10000) return fail("invalid_paths")
	return SEED.test(input.seed ?? "") ? null : fail("invalid_seed")
}

/** The chance plan the three flags state, or null when none is given. Only once checkChance has held. */
export function chancePlanOf(input: PlanInput): ChancePlan | null {
	if (input.returnModel === null || input.paths === null || input.seed === null) return null
	return { returnModel: input.returnModel, paths: input.paths, seed: input.seed }
}
