import { z } from "zod"

/** The most Market paths one chance runs, and the fewest. */
const MIN_PATHS = 1
const MAX_PATHS = 10000

/** The shape of `--seed`: sixteen lower-case hex digits. */
const SEED_PATTERN = /^[0-9a-f]{16}$/

/**
 * `--paths`: the Market paths the chance runs. The CLI words a built-in range refusal with one generic
 * sentence (ADR-0013), so each bound is a custom check that states itself, and `meta` keeps the bounds in
 * the published schema (`minimum`, `maximum`), which `schema.test.ts` pins.
 */
export const pathsFlag: z.ZodOptional<z.ZodNumber> = z
	.number()
	.int()
	.refine((paths) => paths >= MIN_PATHS, "The value must be at least 1 Market path.")
	.refine((paths) => paths <= MAX_PATHS, "The value must be at most 10,000 Market paths.")
	.meta({ minimum: MIN_PATHS, maximum: MAX_PATHS })
	.optional()
	.describe(
		"The Market paths the chance runs, from 1 to 10,000. Needs --seed, and --return-model unless the Scenarios state a volatility (then `plan`).",
	)

/** `--seed`: sixteen lower-case hex digits the Market paths are drawn from. */
export const seedFlag: z.ZodOptional<z.ZodString> = z
	.string()
	.refine((seed) => SEED_PATTERN.test(seed), "The value must be sixteen lower-case hex digits.")
	.meta({ pattern: SEED_PATTERN.source })
	.optional()
	.describe("Sixteen lower-case hex digits the Market paths are drawn from.")
