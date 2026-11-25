import type { core } from "zod"
import type { IngestError, IngestErrorCode } from "./errors"

type Issue = {
	code: string
	path: readonly PropertyKey[]
	message: string
	params?: Record<string, unknown> | undefined
}

/** Adds one domain rule failure at a path relative to the row being checked. */
export function custom(
	ctx: core.$RefinementCtx,
	path: PropertyKey[],
	code: IngestErrorCode,
	message: string,
): void {
	ctx.addIssue({ code: "custom", path, message, params: { code } })
}

function codeOf(issue: Issue): IngestErrorCode {
	const code = issue.params?.["code"]
	if (issue.code === "custom" && typeof code === "string") return code as IngestErrorCode
	return "ROW_INVALID"
}

/** Converts a zod issue into the API's error shape, prefixed with the caller's path. */
export function toIngestError(issue: Issue, prefix: string): IngestError {
	const path = [prefix, ...issue.path.map(String)].filter((part) => part.length > 0).join(".")
	return { path, code: codeOf(issue), message: issue.message }
}
