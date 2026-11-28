/**
 * The row a viewing month reads (web ADR 0033): net worth at a plan and a month, the period that holds the month,
 * and the Rule year that holds it. Every date is compared as the CLI wrote it, and no figure is computed.
 */
import type { NetWorth, Read, Snapshot } from "../../contract"
import { type MonthlyRow, monthlyRowsOf } from "../projection/annual"
import { firstDayOf, lastDayOf, monthOf } from "./month"

/** Which side of a period a month falls on: a roll-up, a tax year or a Rule year. */
export type Side = "in" | "before" | "after" | "ranOut"

/** The period a month was read against, and which side of it the month is on. */
export interface PeriodAt<T> {
	readonly period: T
	readonly side: Side
}

/**
 * Net worth at a viewing month. `past` and `today` carry the Read `traj` stated at the month-end (or at the As-of,
 * for `today`), and `future` the monthly row whose date falls in the month. `ranOut` says the plan ended before the
 * month and carries the run-out date, and `missing` says no row states the month at all.
 */
export type NetWorthAt =
	| { readonly kind: "today"; readonly read: Read<NetWorth> }
	| { readonly kind: "past"; readonly read: Read<NetWorth> }
	| { readonly kind: "future"; readonly row: MonthlyRow }
	| { readonly kind: "ranOut"; readonly date: string }
	| { readonly kind: "missing" }

/**
 * The last monthly row whose date falls in a month, or null when none does. Monthly rows step from the As-of by
 * calendar month and a plan's last month holds the row at the horizon or the run-out date, so the later row wins.
 */
export function monthlyRowFor(rows: readonly MonthlyRow[], month: string): MonthlyRow | null {
	let found: MonthlyRow | null = null
	for (const row of rows) if (monthOf(row.date) === month) found = row
	return found
}

/** Net worth at one month of one plan, from the Read the Snapshot holds for that side of the As-of. */
export function netWorthAt(snapshot: Snapshot, plan: string, month: string): NetWorthAt {
	const asOf = monthOf(snapshot.params.asOf)
	if (month === asOf) return { kind: "today", read: snapshot.reads.netWorth }
	if (month < asOf) return pastAt(snapshot, month)
	return futureAt(snapshot, plan, month)
}

/** A past month: the history Read at the month's own date. A failed Read, or one that states no totals, has no row. */
function pastAt(snapshot: Snapshot, month: string): NetWorthAt {
	const index = snapshot.params.historyDates.findIndex((date) => monthOf(date) === month)
	const read = snapshot.reads.netWorthHistory[index]
	if (index < 0 || read === undefined) return { kind: "missing" }
	if (!read.ok || read.data.totals === null) return { kind: "missing" }
	return { kind: "past", read }
}

/**
 * A future month: the monthly row in the month, else the plan's run-out saying so, else no figure. The run-out
 * date is before the month's first day, because a month the plan ran out inside holds the run-out row.
 */
function futureAt(snapshot: Snapshot, plan: string, month: string): NetWorthAt {
	const read = snapshot.reads.monthly[plan]
	if (read === undefined || !read.ok) return { kind: "missing" }
	const row = monthlyRowFor(monthlyRowsOf(read.data) ?? [], month)
	if (row !== null) return { kind: "future", row }
	const date = read.data.runsOut?.date ?? null
	if (date !== null && date < firstDayOf(month)) return { kind: "ranOut", date }
	return { kind: "missing" }
}

/**
 * The period that holds a month, from any list in date order whose rows span `from` to `to`: the Annual roll-ups or
 * the tax years. A month the plan ran out inside is `in` the period that overlaps it, and a month after the last
 * period is `ranOut` when the plan ran out, `after` otherwise. A month in a gap between periods has no period.
 */
export function periodFor<T extends { from: string; to: string }>(
	periods: readonly T[],
	month: string,
	runsOut: string | null,
): PeriodAt<T> | null {
	const first = periods[0]
	const last = periods.at(-1)
	if (first === undefined || last === undefined) return null
	const starts = firstDayOf(month)
	const ends = lastDayOf(month)
	const holding = periods.findLast((period) => period.from <= ends && period.to >= starts)
	if (holding !== undefined) return { period: holding, side: "in" }
	if (ends < first.from) return { period: first, side: "before" }
	if (starts > last.to) return { period: last, side: runsOut === null ? "after" : "ranOut" }
	return null
}

/**
 * The Rule year that holds a month. A rule's row stands from its date until the next row's date, and the last row
 * until the plan's `end` (the run-out date, or the horizon), so the last row at or before the month is its year.
 * A month the plan ended before is `ranOut` when it ran out, `after` as the guard, and the first row before it is `before`.
 */
export function ruleYearFor<T extends { date: string }>(
	rows: readonly T[],
	month: string,
	end: string,
	runsOut: string | null,
): PeriodAt<T> | null {
	const first = rows[0]
	const last = rows.at(-1)
	if (first === undefined || last === undefined) return null
	const starts = firstDayOf(month)
	const ends = lastDayOf(month)
	if (ends < first.date) return { period: first, side: "before" }
	if (starts > end) return { period: last, side: runsOut === null ? "after" : "ranOut" }
	const standing = rows.findLast((row) => row.date <= ends)
	if (standing !== undefined) return { period: standing, side: "in" }
	return null
}
