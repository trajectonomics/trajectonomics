import type { Context, Result } from "../command"
import { type AppError, fail } from "../errors"
import { netWorthOf } from "./networth"
import { netWorthMonthlyOf } from "./networth-monthly"
import { withLedger } from "./with-ledger"

/** What `report networth` takes: `--as-of` for one date, or `--monthly` with `--since` and `--until`. */
export type NetWorthFlags = {
	asOf?: string | undefined
	monthly?: boolean | undefined
	since?: string | undefined
	until?: string | undefined
}

/**
 * Picks the form the flags name and refuses a flag the form cannot take. The forms are checked here,
 * not in a refine, as `account value` does (ADR-0020), and no date is chosen for the caller (ADR-0029).
 */
export function networthForm(input: NetWorthFlags, ctx: Context): Result<unknown> | AppError {
	if (input.monthly !== true) {
		for (const field of ["since", "until"] as const) {
			if (input[field] === undefined) continue
			return fail("invalid_input", { path: field, message: `${field}: --${field} needs --monthly` })
		}
		const asOf = input.asOf
		if (asOf === undefined) {
			return fail("invalid_input", {
				path: "asOf",
				message: "asOf: A required flag is missing.",
				details: [{ path: "asOf", message: "A required flag is missing." }],
			})
		}
		return withLedger(ctx, (ledger) => netWorthOf(ledger, asOf))
	}
	if (input.asOf !== undefined) {
		return fail("invalid_input", {
			path: "asOf",
			message: "asOf: --monthly states a range with --since and --until, not one --as-of",
		})
	}
	const until = input.until
	if (until === undefined) {
		return fail("invalid_input", {
			path: "until",
			message: "until: --monthly needs --until, the last date of the range; traj reads no clock",
		})
	}
	return withLedger(ctx, (ledger) => netWorthMonthlyOf(ledger, { since: input.since, until }))
}
