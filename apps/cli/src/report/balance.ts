import { balances, netWorth } from "@trajectonomics/core/ledger"
import { checkedDate } from "../date"
import type { AppError } from "../errors"
import { isAppError } from "../errors"
import { hintField } from "../hint"
import type { Ledger } from "../store"
import { type FieldMap, type FieldRules, query, respell } from "./errors"
import { reportHint } from "./hint"
import { type RecordStart, recordStartOf } from "./record"
import { accountIndex, reportRowsOf, totalsOf } from "./rows"
import { isTotalRefused, netWorthRead, type TotalRefusal } from "./total"
import { trialOf } from "./trial"
import type { ReportRow, TotalView, TrialBalanceReport } from "./view"

// The core names its own queries; every one of these paths is respelled into this result's keys.
const FIELDS: FieldRules = [
	["balances[", "rows["],
	["netWorth.totals[", "netWorth["],
	["netWorth.rows[", "rows["],
]

const fields: FieldMap = (field) => respell(field, FIELDS)

/** `traj balance`: every Leaf Account's Balance, the net-worth total, and an optional Trial Balance. */
export type BalanceResult = RecordStart & {
	asOf: string
	rows: ReportRow[]
	/** The net-worth total per currency, or null when the accounts' sum leaves the safe range (ADR-0079). */
	netWorth: TotalView[] | null
	/** Why `netWorth` is null; absent when it is stated. */
	netWorthError?: TotalRefusal | undefined
	/** The Trial Balance; its totals are null, with `totalsError`, when a column's sum leaves the safe range. */
	trialBalance?: TrialBalanceReport | undefined
	hint?: string | undefined
}

function readings(ledger: Ledger, asOf: string) {
	const rows = query(() => balances(ledger.transactions, asOf, ledger.chart), fields)
	if (isAppError(rows)) return rows
	// A refused total leaves every row stated: each account is in range, only their sum is not.
	const worth = netWorthRead(() => netWorth(ledger.transactions, asOf, ledger.chart), fields)
	if (isAppError(worth)) return worth
	return { rows, worth }
}

/** Assembles the balance result from one assembled read; the Command only renders it. */
export function balanceOf(
	ledger: Ledger,
	input: { asOf: string; trialBalance?: boolean | undefined },
): BalanceResult | AppError {
	const date = checkedDate(input.asOf, "asOf")
	if (isAppError(date)) return date
	const index = accountIndex(ledger.accounts)
	const read = readings(ledger, input.asOf)
	if (isAppError(read)) return read
	const trial = input.trialBalance === true ? trialOf(ledger, input.asOf) : undefined
	if (isAppError(trial)) return trial
	const rows = reportRowsOf(read.rows, index)
	const hint = reportHint(ledger, rows)
	return {
		asOf: input.asOf,
		...recordStartOf(ledger.transactions, input.asOf),
		rows,
		...(isTotalRefused(read.worth)
			? { netWorth: null, netWorthError: read.worth.totalRefused.body }
			: { netWorth: totalsOf(read.worth.totals) }),
		...(trial === undefined ? {} : { trialBalance: trial }),
		...hintField(hint),
	}
}
