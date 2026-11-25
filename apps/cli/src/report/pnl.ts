import type { ProfitAndLossOptions } from "@trajectonomics/core/ledger"
import { profitAndLoss, profitAndLossRows } from "@trajectonomics/core/ledger"
import { checkedDate } from "../date"
import type { AppError } from "../errors"
import { isAppError } from "../errors"
import { hintField } from "../hint"
import type { Ledger } from "../store"
import { type FieldMap, type FieldRules, query, respell } from "./errors"
import { reportHint } from "./hint"
import { accountIndex, reportRowsOf, totalsOf } from "./rows"
import { isTotalRefused, PNL_TOTAL, type TotalRefusal, totalRead } from "./total"
import type { ReportRow, TotalView } from "./view"

// The core names its own queries and period options; respell them into this result's keys.
const FIELDS: FieldRules = [
	["profitAndLoss.rows[", "rows["],
	["profitAndLoss.totals[", "totals["],
	["options.from", "since"],
	["options.to", "until"],
]

const fields: FieldMap = (field) => respell(field, FIELDS)

/** `traj report pnl`: income minus expenses over an inclusive period, optionally by Project. */
export type PnlResult = {
	since: string | null
	until: string
	project: string | null
	rows: ReportRow[]
	/** Income minus expenses per currency, or null when the rows' sum leaves the safe range (ADR-0079). */
	totals: TotalView[] | null
	/** Why `totals` is null; absent when it is stated. */
	totalsError?: TotalRefusal | undefined
	hint?: string | undefined
}

function optionsOf(input: {
	since?: string | undefined
	until: string
	project?: string | undefined
}): ProfitAndLossOptions {
	return {
		to: input.until,
		...(input.since === undefined ? {} : { from: input.since }),
		...(input.project === undefined ? {} : { where: { project: input.project } }),
	}
}

/** Assembles the P&L from one assembled read; the Command only renders it. */
export function pnlOf(
	ledger: Ledger,
	input: { since?: string | undefined; until: string; project?: string | undefined },
): PnlResult | AppError {
	const since = input.since === undefined ? null : checkedDate(input.since, "since")
	if (isAppError(since)) return since
	const until = checkedDate(input.until, "until")
	if (isAppError(until)) return until
	const index = accountIndex(ledger.accounts)
	const options = optionsOf(input)
	const result = totalRead(
		() => profitAndLoss(ledger.transactions, options, ledger.chart),
		fields,
		PNL_TOTAL,
	)
	if (isAppError(result)) return result
	// A refused total leaves the rows stated: every row is in range, only their sum is not.
	const stated = isTotalRefused(result)
		? query(() => profitAndLossRows(ledger.transactions, options, ledger.chart), fields)
		: result.rows
	if (isAppError(stated)) return stated
	const rows = reportRowsOf(stated, index)
	const hint = reportHint(ledger, rows)
	return {
		since: input.since ?? null,
		until: input.until,
		project: input.project ?? null,
		rows,
		...(isTotalRefused(result)
			? { totals: null, totalsError: result.totalRefused.body }
			: { totals: totalsOf(result.totals) }),
		...hintField(hint),
	}
}
