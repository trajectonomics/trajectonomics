import { isDay } from "./window"

/** The `asOf` a page was opened with, or null for the live view; a malformed value is ignored. */
export function readAsOf(search: string): string | null {
	const value = new URLSearchParams(search).get("asOf")
	return value !== null && isDay(value) ? value : null
}
