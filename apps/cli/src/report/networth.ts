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
import {
	countedRows,
	isTotalRefused,
	netWorthRead,
	type TotalRefusal,
	type TotalRefused,
} from "./total"
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
	/** The total per currency, or null when the accounts' sum leaves the safe range (ADR-0079). */
	totals: TotalView[] | null
	/** Why `totals` is null; absent when it is stated. */
	totalsError?: TotalRefusal | undefined
	hint?: string | undefined
}

/** Assembles one date's result from `read`, the core's answer for it; the Command only renders it. */
function assemble(
	ledger: Ledger,
	asOf: string,
	index: ReturnType<typeof accountIndex>,
	read: () => NetWorth | TotalRefused | AppError,
): NetWorthResult | AppError {
	const date = checkedDate(asOf, "asOf")
	if (isAppError(date)) return date
	const result = read()
	if (isAppError(result)) return result
	// A refused total leaves the rows stated: every account is in range, only their sum is not.
	const counted = isTotalRefused(result) ? countedRows(ledger, asOf, index, fieldOf) : result.rows
	if (isAppError(counted)) return counted
	const rows = reportRowsOf(counted, index)
	const hint = reportHint(ledger, rows)
	return {
		asOf,
		...recordStartOf(ledger.transactions, asOf),
		rows,
		...(isTotalRefused(result)
			? { totals: null, totalsError: result.totalRefused.body }
			: { totals: totalsOf(result.totals) }),
		...hintField(hint),
	}
}

/** Assembles net worth from one assembled read; the Command only renders it. */
export function netWorthOf(ledger: Ledger, asOf: string): NetWorthResult | AppError {
	return assemble(ledger, asOf, accountIndex(ledger.accounts), () =>
		netWorthRead(() => netWorth(ledger.transactions, asOf, ledger.chart), fieldOf),
	)
}

/** One date's answer from a Ledger that was scanned once. */
export type NetWorthReader = (asOf: string) => NetWorthResult | AppError

/**
 * The same read for many dates: the Ledger is scanned once, and each date's answer is `netWorthOf`'s
 * for it, the refusal of an overflow included. A Ledger the scan itself refuses is refused for
 * every date alike, so that refusal is returned once, in place of a reader, and not repeated per date.
 */
export function netWorthReader(ledger: Ledger): NetWorthReader | AppError {
	const index = accountIndex(ledger.accounts)
	const history = query(() => netWorthHistory(ledger.transactions, ledger.chart), fieldOf)
	if (isAppError(history)) return history
	return (asOf) =>
		assemble(ledger, asOf, index, () => netWorthRead(() => history.at(asOf), fieldOf))
}
