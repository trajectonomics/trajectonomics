import { errorMessage, parseSnapshotText } from "./parse-snapshot"
import type { Invalid, SnapshotState } from "./state"

/** The part of a fetch response the loader reads. A browser's Response has all of it. */
export interface FetchedText {
	readonly ok: boolean
	readonly status: number
	text(): Promise<string>
}

/** Reads a URL as text. Injected, so the loader itself performs no I/O. */
export type TextFetcher = (url: string) => Promise<FetchedText>

/**
 * Reads one Snapshot. A 404 is a missing file, and so is a 200 whose body is empty or a page of HTML:
 * a static server such as `vite preview` answers an unknown path with its app page. Any other failure,
 * or a body that is not a Snapshot (broken JSON included), is an invalid one. It never throws: the page
 * renders whichever state it returns.
 */
export async function fetchSnapshot(url: string, fetchText: TextFetcher): Promise<SnapshotState> {
	try {
		const response = await fetchText(url)
		if (response.status === 404) return { status: "missing", url }
		if (!response.ok) return invalid(url, `could not be read (HTTP ${response.status})`)
		const text = await response.text()
		if (isAppPage(text)) return { status: "missing", url }
		const parsed = parseSnapshotText(text)
		return parsed.ok
			? { status: "ready", url, snapshot: parsed.snapshot }
			: invalid(url, parsed.reason, parsed.details)
	} catch (error) {
		return invalid(url, `could not be read (${errorMessage(error)})`)
	}
}

/** Whether a body is what a static server sends for a file it does not have: nothing, or its HTML page. */
function isAppPage(text: string): boolean {
	const body = text.trimStart()
	return body === "" || body.startsWith("<")
}

function invalid(url: string, reason: string, details: readonly string[] = []): Invalid {
	return { status: "invalid", url, reason, details }
}
