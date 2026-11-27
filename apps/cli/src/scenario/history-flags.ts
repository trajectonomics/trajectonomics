import { z } from "zod"
import { type AppError, fail } from "../errors"

/** The flags that build a template from the Ledger's run-rates (cli ADR-0082). */
export type HistoryFlags = {
	template?: boolean | undefined
	asOf?: string | undefined
	fromHistory?: boolean | undefined
	months?: number | undefined
}

export const fromHistoryFlag: z.ZodOptional<z.ZodBoolean> = z
	.boolean()
	.optional()
	.describe(
		"With --template and --as-of, one Stream per income and expense Account from `traj baseline rates`, in place of the two zero Streams.",
	)

export const monthsFlag: z.ZodOptional<z.ZodNumber> = z
	.number()
	.int()
	.min(3)
	.max(36)
	.optional()
	.describe("With --from-history, the window length.")

/**
 * `--from-history` builds a template, so it needs one and its As-of; `--months` sets the window it
 * reads, so it needs `--from-history`.
 */
export function historyRefusal(input: HistoryFlags): AppError | undefined {
	if (input.fromHistory === true && (input.template !== true || input.asOf === undefined)) {
		return fail("invalid_input", {
			path: "fromHistory",
			message: "fromHistory: builds a template from the Ledger, so it needs --template and --as-of",
			hint: 'Run "traj scenario apply --template --as-of <date> --from-history".',
		})
	}
	if (input.months !== undefined && input.fromHistory !== true) {
		return fail("invalid_input", {
			path: "months",
			message: "months: sets the window --from-history reads, so it needs --from-history",
		})
	}
	return undefined
}
