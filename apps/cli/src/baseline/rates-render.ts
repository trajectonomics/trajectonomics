import { recordNoteBlocks } from "../report/record"
import type { RenderHint } from "../table"
import { type ColumnHint, isRecord, tableLines } from "../table/lines"

const ROUNDING = "Amounts are rounded half away from zero to the satang."

/** Why a row is not in the plan, in the words a person reads in the In plan column. */
const REASONS: Readonly<Record<string, string>> = {
	archived: "closed",
	negative: "refunds exceed it",
	zero: "nets to zero",
}

const COLUMNS: readonly ColumnHint[] = [
	{ key: "account", label: "Account" },
	{ key: "type", label: "Type" },
	{ key: "per", label: "Per" },
	{ key: "amount", label: "Amount", align: "right" },
	{ key: "months", label: "Months" },
	{ key: "inPlan", label: "In plan" },
]

const TOTALS_COLUMNS: readonly ColumnHint[] = [
	{ key: "type", label: "Type" },
	{ key: "total", label: "Total", align: "right" },
	{ key: "monthly", label: "Monthly", align: "right" },
]

function inPlanText(row: Record<string, unknown>): string {
	if (row["inTemplate"] === true) return "yes"
	const reason = row["leftOutBecause"]
	const words = typeof reason === "string" ? REASONS[reason] : undefined
	return words === undefined ? "no" : `no: ${words}`
}

/** One row flattened for the table: the Account's name, its one occurrence and the plan's verdict. */
function shownRow(row: Record<string, unknown>, monthsCovered: unknown): Record<string, unknown> {
	const account = isRecord(row["account"]) ? row["account"] : {}
	return {
		account: account["name"] ?? "",
		type: row["type"] ?? "",
		per: row["frequency"] === "yearly" ? "year" : "month",
		amount: row["amount"] ?? "",
		months: `${String(row["monthsWithActivity"])} of ${String(monthsCovered)}`,
		inPlan: inPlanText(row),
	}
}

/** The body the human form prints: the table of rows, which is the answer the caller came for. */
function ratesShown(data: Record<string, unknown>): Record<string, unknown> {
	const rows = Array.isArray(data["rows"]) ? data["rows"].filter(isRecord) : []
	const shown = rows.map((row) => shownRow(row, data["monthsCovered"]))
	return { tables: [{ name: "rates", count: shown.length, rows: shown }] }
}

/** The totals, as their own table: always the income entry, then the expense entry. */
function totalsTable(data: Record<string, unknown>): string | null {
	const rows = Array.isArray(data["totals"]) ? data["totals"].filter(isRecord) : []
	return rows.length === 0 ? null : tableLines("totals", rows.length, rows, TOTALS_COLUMNS)
}

/** The two sentences a short window earns: how much it covers, or that it covers no full month. */
function coverageLines(data: Record<string, unknown>): string[] {
	const monthsCovered = data["monthsCovered"]
	const months = data["months"]
	if (typeof monthsCovered !== "number" || typeof months !== "number") return []
	if (monthsCovered > 0 && monthsCovered < months) {
		const covered = isRecord(data["covered"]) ? data["covered"] : {}
		const from = String(covered["from"] ?? "").slice(0, 7)
		const to = String(covered["to"] ?? "").slice(0, 7)
		return [`Covers ${monthsCovered} of the ${months} months asked: ${from} to ${to}.`]
	}
	if (monthsCovered === 0 && typeof data["firstTransactionDate"] === "string") {
		return [
			`No full month is recorded before ${String(data["asOf"])}, so there is no run-rate yet.`,
		]
	}
	return []
}

/** The lines after the table and its totals: the coverage, the rounding rule, and the record note. */
function ratesBlocks(data: Record<string, unknown>): string[] {
	const totals = totalsTable(data)
	const hint = typeof data["hint"] === "string" ? [`hint: ${data["hint"]}`] : []
	return [
		...(totals === null ? [] : [totals]),
		...coverageLines(data),
		ROUNDING,
		...recordNoteBlocks(data),
		...hint,
	]
}

/** How `baseline rates` renders for a person: the rows, the totals, and what the window covers. */
export const ratesRender: RenderHint = {
	tables: "tables",
	rows: "rows",
	columns: { rates: COLUMNS },
	display: ratesShown,
	blocks: ratesBlocks,
}
