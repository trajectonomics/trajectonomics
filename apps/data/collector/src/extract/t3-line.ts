import type { JsonObject } from "./parse"
import { parseJsonLine } from "./parse"

/** One T3 provider log line: its leading bracketed timestamp and decoded payload. */
export type T3Record = {
	timestamp: string
	payload: JsonObject
}

const LINE = /^\[([^\]]+)\]\s+[^:]+:\s*(\{.*\})\s*$/

/** Parses a T3 provider log line, tolerating lines that are not a timestamped JSON event. */
export function parseT3Line(line: string): T3Record | null {
	const match = LINE.exec(line)
	const timestamp = match?.[1]
	const json = match?.[2]
	if (!timestamp || !json) return null
	const payload = parseJsonLine(json)
	return payload ? { timestamp, payload } : null
}
