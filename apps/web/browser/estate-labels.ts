import type { Page } from "@playwright/test"
import {
	BRACKETED,
	CYRILLIC,
	ENCLOSED,
	FAMILY,
	JAPANESE,
	JAPANESE_PUNCTUATION,
	THAI,
	VIETNAMESE,
	WIDE,
} from "./flow-label-cases"
import type {
	CashflowRow,
	CashflowTable,
	FlowSnapshot,
	ProjectionRead,
} from "./flow-label-snapshot"
import { serveFlowLabels } from "./flow-labels"

/** The hard names the Estate test draws on its lines, on the side where a start-anchored name meets its amount. */
const HARD_NAMES = [
	JAPANESE,
	JAPANESE_PUNCTUATION,
	CYRILLIC,
	ENCLOSED,
	WIDE,
	FAMILY,
	THAI,
	VIETNAMESE,
	BRACKETED,
] as const

/** The projection the Demo shows first, which is the plan the Estate page opens on. */
function firstProjection(snapshot: FlowSnapshot, name: string): ProjectionRead {
	const projection = snapshot.reads.projections[name]
	if (projection?.ok !== true || projection.data === undefined) {
		throw new Error(`the Demo projects no ${name} plan`)
	}
	return projection
}

/** The last date the estate states, which `?estate=end` chooses and the page would choose by default too. */
function lastDate(tables: readonly CashflowTable[]): string {
	const estate = tables.find((table) => table.name === "estate")
	const lines = tables.find((table) => table.name === "estateLines")
	const date = estate?.rows.at(-1)?.date ?? lines?.rows.at(-1)?.date
	if (date === undefined) throw new Error("the Demo's estate has no date")
	return date
}

/** The lines of one date, which the diagram draws as its costs and gifts. */
function linesOn(lines: CashflowTable, date: string): CashflowRow[] {
	const onDate = lines.rows.filter((row) => row.date === date)
	if (onDate.length === 0) throw new Error(`the Demo's estate states no lines on ${date}`)
	return onDate
}

/** Renames each line of the date to a hard name, and adds enough lines to draw every one of them. */
function patchLines(lines: CashflowTable, date: string): void {
	const onDate = linesOn(lines, date)
	const [first] = onDate
	if (first === undefined) throw new Error(`the Demo's estate states no lines on ${date}`)
	for (const [index, row] of onDate.entries()) {
		const hard = HARD_NAMES[index]
		if (hard !== undefined) row.line = hard
	}
	for (let index = onDate.length; index < HARD_NAMES.length; index++) {
		const hard = HARD_NAMES[index]
		if (hard !== undefined) lines.rows.push({ ...first, line: hard, kind: "cost" })
	}
}

/**
 * The Demo snapshot with hard names on the estate lines of the date the page shows by default. The last
 * estate row is the plan's last year, which `?estate=end` asks for, so every name drawn is one the review's
 * measurements cut on the side beside its amount.
 */
export async function longEstateLabels(page: Page): Promise<FlowSnapshot> {
	const response = await page.request.get("/demo/snapshot.json")
	const snapshot = (await response.json()) as FlowSnapshot
	const name = snapshot.params.scenarios[0]
	if (name === undefined) throw new Error("the Demo lists no plan")
	const tables = firstProjection(snapshot, name).data?.tables ?? []
	const lines = tables.find((table) => table.name === "estateLines")
	if (lines === undefined) throw new Error("the Demo states no estate lines")
	patchLines(lines, lastDate(tables))
	return snapshot
}

/** Serves the Estate's patched Snapshot where the Demo page reads it. */
export async function serveEstateLabels(page: Page, snapshot: FlowSnapshot): Promise<void> {
	await serveFlowLabels(page, snapshot)
}
