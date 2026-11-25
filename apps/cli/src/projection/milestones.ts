import type { MilestoneResult } from "@trajectonomics/core/sim"
import { z } from "zod"
import { type ColumnHint, isRecord, tableLines } from "../table/lines"
import { dateField } from "./money"

/*
 * Each Milestone's fire date as a Projection reports it (cli ADR-0049): the date it fired, or null
 * when it did not fire by the Projection's end. Rows come in Scenario order, straight from the
 * engine's `milestones`. The human Format states an unreached date as the date it was checked to
 * (the run-out month, or the horizon); JSON keeps null.
 */

/** One Milestone's row in a Projection's table, or in a side of a compare. */
export type MilestoneRow = { id: string; reached: boolean; date: string | null }

export const milestoneRow: z.ZodType<MilestoneRow> = z.strictObject({
	id: z.string().describe("The Milestone's id, as the Scenario names it."),
	reached: z.boolean().describe("True when the Milestone fired by the end of the Projection."),
	date: dateField("The date the Milestone fired, or null when it did not fire by the end")
		.nullable()
		.describe("The date the Milestone fired, as YYYY-MM-DD, or null when it did not fire."),
})

/** The engine's results as rows: a fired Milestone keeps its date, an unreached one has none. */
export function milestoneRowsOf(milestones: readonly MilestoneResult[]): MilestoneRow[] {
	return milestones.map((milestone) =>
		milestone.reached
			? { id: milestone.id, reached: true, date: milestone.date }
			: { id: milestone.id, reached: false, date: null },
	)
}

/** The human columns of the milestones table: every key a row carries, headed as it is spelled. */
export const milestoneColumns: readonly ColumnHint[] = [
	{ key: "id", label: "id" },
	{ key: "reached", label: "reached" },
	{ key: "date", label: "date" },
]

/** The sentence a person reads for a Milestone that did not fire, naming the date it was checked to. */
function notReachedBy(date: string): string {
	return `not reached by ${date}`
}

/** The rows with each unreached date stated as the date it was checked to; other rows are kept. */
function shownRows(rows: unknown, checkedTo: string | undefined): unknown {
	if (!Array.isArray(rows) || checkedTo === undefined) return rows
	return rows.map((row) =>
		isRecord(row) && row["reached"] === false ? { ...row, date: notReachedBy(checkedTo) } : row,
	)
}

/** The date a run's Milestones were checked to: the run-out month when the plan ran out, else the horizon. */
function runCheckedTo(data: Record<string, unknown>): string | undefined {
	const runsOut = data["runsOut"]
	if (isRecord(runsOut) && typeof runsOut["date"] === "string") return runsOut["date"]
	const horizon = data["horizon"]
	return typeof horizon === "string" ? horizon : undefined
}

/** `projection run`'s human view of the milestones table: the unreached dates read as sentences. */
export function runMilestonesShown(data: Record<string, unknown>): Record<string, unknown> {
	const tables = data["tables"]
	if (!Array.isArray(tables)) return data
	const checkedTo = runCheckedTo(data)
	return {
		...data,
		tables: tables.map((entry) =>
			isRecord(entry) && entry["name"] === "milestones"
				? { ...entry, rows: shownRows(entry["rows"], checkedTo) }
				: entry,
		),
	}
}

/** The two sides of a compare, each as `[label, side]`, in the order the result states them. */
function sidesOf(data: Record<string, unknown>): [string, Record<string, unknown>][] {
	const sides = data["sides"]
	if (!isRecord(sides)) return []
	return ["a", "b"].flatMap((label) => {
		const side = sides[label]
		return isRecord(side) ? [[label, side]] : []
	})
}

/** A compare side's date to check unreached Milestones against: its run-out month, else the horizon. */
function sideCheckedTo(side: Record<string, unknown>, data: Record<string, unknown>) {
	const runOut = side["runOut"]
	if (isRecord(runOut) && typeof runOut["date"] === "string") return runOut["date"]
	const horizon = data["horizon"]
	return typeof horizon === "string" ? horizon : undefined
}

/**
 * `projection compare`'s human body leaves each side's milestones out: they are printed as their
 * own table after the body, so the listing does not show them twice.
 */
export function compareMilestonesHidden(data: Record<string, unknown>): Record<string, unknown> {
	const sides = data["sides"]
	if (!isRecord(sides)) return data
	const hidden = Object.fromEntries(
		Object.entries(sides).map(([label, side]) => [
			label,
			isRecord(side)
				? Object.fromEntries(Object.entries(side).filter(([key]) => key !== "milestones"))
				: side,
		]),
	)
	return { ...data, sides: hidden }
}

/** One table per side that declares Milestones, the unreached dates read as sentences. */
export function compareMilestoneBlocks(data: Record<string, unknown>): string[] {
	return sidesOf(data).flatMap(([label, side]) => {
		const rows = side["milestones"]
		if (!Array.isArray(rows) || rows.length === 0) return []
		const shown = shownRows(rows, sideCheckedTo(side, data))
		return [
			tableLines(
				`milestones of ${label.toUpperCase()}`,
				rows.length,
				shown as unknown[],
				milestoneColumns,
			),
		]
	})
}
