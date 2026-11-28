import { errorMessage } from "../message"
import type { IngestRow } from "../rows"
import { batchRows, type SendBatch } from "./batch"

/** The part of a fetch response the sender reads. */
export type FetchResponse = {
	ok: boolean
	status: number
	json: () => Promise<unknown>
}

/** The POST-only fetch signature the sender needs; tests inject a fake. */
export type FetchLike = (
	url: string,
	init: { method: "POST"; headers: Record<string, string>; body: string },
) => Promise<FetchResponse>

/** One batch's outcome with the rows it carried. */
export type BatchReport = { rows: IngestRow[]; ok: boolean }

/** The outcome of a whole send, batch by batch. */
export type SendReport = { ok: boolean; batches: BatchReport[] }

/** Where and how one send runs; the bearer is never logged. */
export type SendOptions = {
	url: string
	bearer: string
	fetch: FetchLike
	log: (line: string) => void
}

type JsonObject = Record<string, unknown>

function asObject(value: unknown): JsonObject | null {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return null
	return value as JsonObject
}

/** The distinct error codes in an ingest error body. */
export function ingestErrorCodes(body: unknown): string[] {
	const errors = asObject(body)?.["errors"]
	if (!Array.isArray(errors)) return []
	const codes = new Set<string>()
	for (const error of errors) {
		const code = asObject(error)?.["code"]
		if (typeof code === "string") codes.add(code)
	}
	return [...codes]
}

/** Formats a non-2xx ingest response without echoing the request. */
export function formatIngestFailure(status: number, body: unknown): string {
	const error = asObject(body)?.["error"]
	const head = typeof error === "string" ? `send: HTTP ${status} ${error}` : `send: HTTP ${status}`
	const codes = ingestErrorCodes(body)
	return codes.length === 0 ? head : `${head}: ${codes.join(", ")}`
}

function carriedRows(batch: SendBatch): IngestRow[] {
	return [...batch.usage, ...batch.quota]
}

async function responseBody(response: FetchResponse): Promise<unknown> {
	try {
		return await response.json()
	} catch {
		return null
	}
}

/** Posts rows in batches; it never retries, and the next run resends the same hours. */
export async function sendRows(
	rows: readonly IngestRow[],
	options: SendOptions,
): Promise<SendReport> {
	const reports: BatchReport[] = []
	for (const batch of batchRows(rows)) {
		const carried = carriedRows(batch)
		let response: FetchResponse
		try {
			response = await options.fetch(options.url, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${options.bearer}`,
					"Content-Type": "application/json",
				},
				body: batch.body,
			})
		} catch (error) {
			options.log(`send: request failed: ${errorMessage(error)}`)
			reports.push({ rows: carried, ok: false })
			continue
		}
		if (!response.ok) {
			options.log(formatIngestFailure(response.status, await responseBody(response)))
			reports.push({ rows: carried, ok: false })
			continue
		}
		reports.push({ rows: carried, ok: true })
	}
	const accepted = reports.reduce(
		(total, report) => total + (report.ok ? report.rows.length : 0),
		0,
	)
	options.log(`send: accepted ${accepted}/${rows.length} row(s) in ${reports.length} batch(es)`)
	return { ok: reports.every((report) => report.ok), batches: reports }
}
