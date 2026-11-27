import type { QuotaRow, UsageRow } from "./types"

/** One row the sender can batch: a usage row or a quota sample. */
export type IngestRow = UsageRow | QuotaRow

const QUOTA_WINDOWS = new Set(["five_hour", "weekly", "monthly"])

/** Whether a parsed line is a quota sample; usage rows never carry a `window`. */
export function isQuotaRow(value: unknown): value is QuotaRow {
	if (typeof value !== "object" || value === null) return false
	const window = (value as Record<string, unknown>)["window"]
	return typeof window === "string" && QUOTA_WINDOWS.has(window)
}

function objectOf(value: unknown, line: number): Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error(`line ${line} is not a JSON object`)
	}
	return value as Record<string, unknown>
}

/** Parses JSON lines into rows, dropping the `kind` marker and rejecting malformed lines. */
export function parseIngestLines(text: string): IngestRow[] {
	const rows: IngestRow[] = []
	text.split("\n").forEach((line, index) => {
		const trimmed = line.trim()
		if (trimmed.length === 0) return
		let parsed: unknown
		try {
			parsed = JSON.parse(trimmed)
		} catch {
			throw new Error(`line ${index + 1} is not JSON`)
		}
		const record = objectOf(parsed, index + 1)
		delete record["kind"]
		const row = record as unknown as IngestRow
		if (!isQuotaRow(row) && typeof (row as Partial<UsageRow>).hourUtc !== "string") {
			throw new Error(`line ${index + 1} is neither a usage row nor a quota row`)
		}
		rows.push(row)
	})
	return rows
}

/** Drops rows whose plan is `unknown`, which the Worker rejects. */
export function dropUnknownPlans(rows: readonly IngestRow[]): {
	rows: IngestRow[]
	dropped: number
} {
	const kept = rows.filter((row) => row.plan !== "unknown")
	return { rows: kept, dropped: rows.length - kept.length }
}
