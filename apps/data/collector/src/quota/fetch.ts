import type { QuotaPlan, QuotaRow } from "../types"

/** The part of a fetch response the sampler reads. */
export type FetchResponse = {
	ok: boolean
	status: number
	json: () => Promise<unknown>
}

/** The request shape the sampler needs; tests inject a fake. */
export type FetchInit = {
	method: "GET" | "POST"
	headers: Record<string, string>
	body?: string
	signal?: AbortSignal
}

/** The fetch signature the sampler needs; tests inject a fake. */
export type FetchLike = (url: string, init: FetchInit) => Promise<FetchResponse>

const FETCH_TIMEOUT_MS = 15_000

/** Fetches one plan's usage body and parses it; a failure logs one line and yields no rows. */
export async function fetchQuotaRows(
	plan: QuotaPlan,
	url: string,
	headers: Record<string, string>,
	parse: (body: unknown, sampledAt: string) => QuotaRow[] | null,
	sampledAt: string,
	deps: { fetch: FetchLike; log: (line: string) => void },
	options?: { method?: "GET" | "POST"; body?: string },
): Promise<QuotaRow[]> {
	let response: FetchResponse
	try {
		const init: FetchInit = {
			method: options?.method ?? "GET",
			headers,
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
		}
		if (options?.body !== undefined) init.body = options.body
		response = await deps.fetch(url, init)
	} catch {
		deps.log(`quota: ${plan} request failed`)
		return []
	}
	if (!response.ok) {
		deps.log(`quota: ${plan} request failed (HTTP ${response.status})`)
		return []
	}
	let body: unknown
	try {
		body = await response.json()
	} catch {
		deps.log(`quota: ${plan} unexpected body (HTTP ${response.status})`)
		return []
	}
	const rows = parse(body, sampledAt)
	if (rows === null) {
		deps.log(`quota: ${plan} unexpected body (HTTP ${response.status})`)
		return []
	}
	deps.log(`quota: ${plan} sampled ${rows.length} rows`)
	return rows
}
