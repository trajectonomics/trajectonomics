/** A parsed JSON object from a log line. */
export type JsonObject = Record<string, unknown>

/** Returns `value` as a JSON object, or `null` for anything else. */
export function asObject(value: unknown): JsonObject | null {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return null
	return value as JsonObject
}

/** Returns `value` when it is a string, else `null`. */
export function asString(value: unknown): string | null {
	return typeof value === "string" ? value : null
}

/** Returns `value` when it is a finite number, else `null`. */
export function asNumber(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null
}

/** Parses one JSON log line into an object, tolerating malformed lines. */
export function parseJsonLine(line: string): JsonObject | null {
	try {
		return asObject(JSON.parse(line))
	} catch {
		return null
	}
}
