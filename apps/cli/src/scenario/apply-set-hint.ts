import { type AppError, fail, isAppError } from "../errors"
import { formatPath } from "./path"
import type { AppliedOverride } from "./set-error"
import { parsePath } from "./set-parse"

/** The anchored path a household conflict names, when the failure is one (cli ADR-0048). */
function anchoredPath(error: AppError): string | undefined {
	if (error.body.code !== "invalid_input") return undefined
	const details = error.body.details as { anchor?: { path?: unknown } } | undefined
	const path = details?.anchor?.path
	return typeof path === "string" ? path : undefined
}

/** A dotted path in its canonical spelling, so an id with an escaped `=` or `.` matches either way. */
function canonicalPath(text: string): string {
	const segments = parsePath(text, 0)
	return isAppError(segments) ? text : formatPath(segments)
}

/** The last `--set` that wrote the anchored path, whose path the hint names. */
function setBehind(
	anchored: string,
	overrides: readonly AppliedOverride[],
): AppliedOverride | undefined {
	const target = canonicalPath(anchored)
	for (let index = overrides.length - 1; index >= 0; index -= 1) {
		const override = overrides[index]
		if (override === undefined) continue
		const path = canonicalPath(override.path)
		if (target === path || target.startsWith(`${path}.`)) return override
	}
	return undefined
}

/**
 * A household anchored-date refusal names the document's own path, such as `document.flows.0.end`,
 * which a what-if caller never wrote; when a `--set` wrote that value, the hint names the Set's path.
 */
export function nameTheSet(error: AppError, overrides: readonly AppliedOverride[]): AppError {
	const anchored = anchoredPath(error)
	if (anchored === undefined) return error
	const set = setBehind(anchored, overrides)
	if (set === undefined) return error
	return fail(error.body.code, {
		message: error.body.message,
		...(error.body.path === undefined ? {} : { path: error.body.path }),
		hint: `The value came from the \`--set\` on \`${set.path}\`. ${error.body.hint ?? ""}`.trim(),
		...(error.body.details === undefined ? {} : { details: error.body.details }),
	})
}
