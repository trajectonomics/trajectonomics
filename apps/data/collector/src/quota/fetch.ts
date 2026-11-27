import type { QuotaPlan, QuotaRow } from "../types"

/** The part of a fetch response the sampler reads. */
export type FetchResponse = {
	ok: boolean
	status: number
	json: () => Promise<unknown>
}

/** The GET-only fetch signature the sampler needs; tests inject a fake. */
export type FetchLike = (
	url: string,
	init: { method: "GET"; headers: Record<string, string> },
) => Promise<FetchResponse>

/** Fetches one plan's usage body and parses it; a failure logs one line and yields no rows. */
export async function fetchQuotaRows(
	plan: QuotaPlan,
	url: string,
	headers: Record<string, string>,
	parse: (body: unknown, sampledAt: string) => QuotaRow[] | null,
	sampledAt: string,
	deps: { fetch: FetchLike; log: (line: string) => void },
): Promise<QuotaRow[]> {
	let response: FetchResponse
	try {
		response = await deps.fetch(url, { method: "GET", headers })
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
	return rows
}
