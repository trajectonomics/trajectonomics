import { type NetWorth, netWorth, netWorthHistory } from "@trajectonomics/core/ledger"
import { checkedDate } from "../date"
import type { AppError } from "../errors"
import { isAppError } from "../errors"
import { hintField } from "../hint"
import type { Ledger } from "../store"
import { type FieldMap, type FieldRules, query, respell } from "./errors"
import { reportHint } from "./hint"
import { type RecordStart, recordStartOf } from "./record"
import { accountIndex, reportRowsOf, totalsOf } from "./rows"
import type { ReportRow, TotalView } from "./view"

// The core names its own query; respell those paths into this result's keys.
const FIELDS: FieldRules = [
	["netWorth.rows[", "rows["],
	["netWorth.totals[", "totals["],
]

/** A non-counted leaf can overflow as `netWorth[<id>]`; what it blocks is the bottom line. */
const fieldOf: FieldMap = (field) =>
	field.startsWith("netWorth[") ? "totals" : respell(field, FIELDS)

/** `traj report networth`: the asset and liability rows behind net worth, and the total per currency. */
export type NetWorthResult = RecordStart & {
	asOf: string
	rows: ReportRow[]
	totals: TotalView[]
	hint?: string | undefined
}

/** Assembles one date's result from `read`, the core's answer for it; the Command only renders it. */
function assemble(
	ledger: Ledger,
	asOf: string,
	index: ReturnType<typeof accountIndex>,
	read: () => NetWorth | AppError,
): NetWorthResult | AppError {
	const date = checkedDate(asOf, "asOf")
	if (isAppError(date)) return date
	const result = read()
	if (isAppError(result)) return result
	const rows = reportRowsOf(result.rows, index)
	const hint = reportHint(ledger, rows)
	return {
		asOf,
		...recordStartOf(ledger.transactions, asOf),
		rows,
		totals: totalsOf(result.totals),
		...hintField(hint),
	}
}

/** Assembles net worth from one assembled read; the Command only renders it. */
export function netWorthOf(ledger: Ledger, asOf: string): NetWorthResult | AppError {
	return assemble(ledger, asOf, accountIndex(ledger.accounts), () =>
		query(() => netWorth(ledger.transactions, asOf, ledger.chart), fieldOf),
	)
}

/**
 * The same read for many dates: the Ledger is scanned once, and each date's answer is `netWorthOf`'s
 * for it, the refusal of an overflow or of a Ledger the scan refuses included.
 */
export function netWorthReader(ledger: Ledger): (asOf: string) => NetWorthResult | AppError {
	const index = accountIndex(ledger.accounts)
	const history = query(() => netWorthHistory(ledger.transactions, ledger.chart), fieldOf)
	return (asOf) =>
		assemble(ledger, asOf, index, () =>
			isAppError(history) ? history : query(() => history.at(asOf), fieldOf),
		)
}
