import { type IngestRow, isQuotaRow } from "../rows"
import type { QuotaRow, UsageRow } from "../types"

export const MAX_BATCH_ROWS = 5_000
export const MAX_BATCH_BYTES = 1_048_576

/** One ingest request body with the rows it carries. */
export type SendBatch = { usage: UsageRow[]; quota: QuotaRow[]; body: string }

type Draft = {
	usage: UsageRow[]
	quota: QuotaRow[]
	usageJson: string[]
	quotaJson: string[]
	bytes: number
}

const encoder = new TextEncoder()
const EMPTY_BODY = '{"usage":[],"quota":[]}'
const BASE_BYTES = encoder.encode(EMPTY_BODY).byteLength

function emptyDraft(): Draft {
	return { usage: [], quota: [], usageJson: [], quotaJson: [], bytes: BASE_BYTES }
}

function finish(draft: Draft): SendBatch {
	return {
		usage: draft.usage,
		quota: draft.quota,
		body: `{"usage":[${draft.usageJson.join(",")}],"quota":[${draft.quotaJson.join(",")}]}`,
	}
}

function groupLength(draft: Draft, quota: boolean): number {
	return quota ? draft.quotaJson.length : draft.usageJson.length
}

function growth(draft: Draft, json: string, quota: boolean): number {
	return encoder.encode(json).byteLength + (groupLength(draft, quota) === 0 ? 0 : 1)
}

function append(draft: Draft, row: IngestRow, json: string, quota: boolean): void {
	if (quota && isQuotaRow(row)) {
		draft.quota.push(row)
		draft.quotaJson.push(json)
		return
	}
	draft.usage.push(row as UsageRow)
	draft.usageJson.push(json)
}

function shouldFlush(
	count: number,
	draft: Draft,
	rowGrowth: number,
	maxRows: number,
	maxBytes: number,
): boolean {
	if (count === 0) return false
	return count >= maxRows || draft.bytes + rowGrowth > maxBytes
}

/** Splits rows into batches within an explicit row count and serialised body size. */
export function batchRowsWithin(
	rows: readonly IngestRow[],
	maxRows: number,
	maxBytes: number,
): SendBatch[] {
	if (maxRows < 1 || maxBytes < BASE_BYTES) {
		throw new Error("batch limits must allow at least one row")
	}
	const batches: SendBatch[] = []
	let draft = emptyDraft()
	let count = 0
	const flush = (): void => {
		if (count === 0) return
		batches.push(finish(draft))
		draft = emptyDraft()
		count = 0
	}
	for (const row of rows) {
		const json = JSON.stringify(row)
		const quota = isQuotaRow(row)
		let rowGrowth = growth(draft, json, quota)
		if (shouldFlush(count, draft, rowGrowth, maxRows, maxBytes)) {
			flush()
			rowGrowth = growth(draft, json, quota)
		}
		if (draft.bytes + rowGrowth > maxBytes) {
			throw new Error(`a row is larger than the ${maxBytes}-byte ingest body limit`)
		}
		draft.bytes += rowGrowth
		append(draft, row, json, quota)
		count += 1
		if (count >= maxRows) flush()
	}
	flush()
	return batches
}

/** Splits rows at the Worker's limits of 5,000 rows and 1 MiB per body. */
export function batchRows(rows: readonly IngestRow[]): SendBatch[] {
	return batchRowsWithin(rows, MAX_BATCH_ROWS, MAX_BATCH_BYTES)
}
