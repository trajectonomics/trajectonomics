import { type AppError, fail } from "../errors"
import type { AppliedOverride } from "./set-error"

/** The anchored path a household conflict names, when the failure is one (cli ADR-0048). */
function anchoredPath(error: AppError): string | undefined {
	if (error.body.code !== "invalid_input") return undefined
	const details = error.body.details as { anchor?: { path?: unknown } } | undefined
	const path = details?.anchor?.path
	return typeof path === "string" ? path : undefined
}

/** The last `--set` that wrote the anchored path, as its caller typed it. */
function setBehind(
	anchored: string,
	sets: readonly string[],
	overrides: readonly AppliedOverride[],
): string | undefined {
	for (let index = overrides.length - 1; index >= 0; index -= 1) {
		const path = overrides[index]?.path
		if (path === undefined) continue
		if (anchored === path || anchored.startsWith(`${path}.`)) return sets[index]
	}
	return undefined
}

/**
 * A household anchored-date refusal names the document's own path, such as `document.flows.0.end`,
 * which a what-if caller never wrote; when a `--set` wrote that value, the hint names the Set.
 */
export function nameTheSet(
	error: AppError,
	sets: readonly string[],
	overrides: readonly AppliedOverride[],
): AppError {
	const anchored = anchoredPath(error)
	if (anchored === undefined) return error
	const set = setBehind(anchored, sets, overrides)
	if (set === undefined) return error
	return fail(error.body.code, {
		message: error.body.message,
		...(error.body.path === undefined ? {} : { path: error.body.path }),
		hint: `The value came from "--set ${set}". ${error.body.hint ?? ""}`.trim(),
		...(error.body.details === undefined ? {} : { details: error.body.details }),
	})
}
