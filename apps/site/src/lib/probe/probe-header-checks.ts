import { type ProbeFailure, type ProbeResponse, probeFailure } from "./probe"

/** The directives a comma-separated header names, lower-cased, so a comparison is about meaning. */
function directivesOf(header: string | null): ReadonlySet<string> {
	const parts = (header ?? "")
		.split(",")
		.map((part) => part.trim().toLowerCase())
		.filter((part) => part.length > 0)
	return new Set(parts)
}

/** The directives a header misses out of the ones the probe expects. */
function missingDirectives(header: string | null, expected: readonly string[]): readonly string[] {
	const present = directivesOf(header)
	return expected.filter((directive) => !present.has(directive))
}

/** An answer that names what it depends on names every directive the probe expects. */
export function checkVary(response: ProbeResponse): readonly ProbeFailure[] {
	const { probe } = response
	const missing = missingDirectives(response.vary, probe.vary)
	if (missing.length === 0) return []
	return [
		probeFailure(
			"PROBE_VARY_WRONG",
			probe.path,
			`names no ${missing.join(", ")} in Vary: ${response.vary ?? "no Vary"}.`,
		),
	]
}

/** An answer that must not be cached by a shared cache names every directive the probe expects. */
export function checkCacheControl(response: ProbeResponse): readonly ProbeFailure[] {
	const { probe } = response
	const missing = missingDirectives(response.cacheControl, probe.cacheControl)
	if (missing.length === 0) return []
	return [
		probeFailure(
			"PROBE_CACHE_CONTROL_WRONG",
			probe.path,
			`names no ${missing.join(", ")} in Cache-Control: ${response.cacheControl ?? "none"}.`,
		),
	]
}
