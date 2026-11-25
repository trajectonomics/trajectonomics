import type { z } from "zod"
import type { AppError } from "./errors"
import { documentPathOf, issueFailure, type Row } from "./invalid"
import { SENTENCES, sentenceOf } from "./sentences"

function paramsOf(issue: z.core.$ZodIssue): Record<string, unknown> {
	const params = "params" in issue ? issue.params : undefined
	return typeof params === "object" && params !== null ? (params as Record<string, unknown>) : {}
}

/**
 * The message a schema authored for a wrong type (`z.string({ error })`), so a document can say the
 * form it wants. The validator's own default starts with "Invalid input" and never reaches the
 * envelope (ADR-0013).
 */
function authoredMessage(issue: z.core.$ZodIssue): string | undefined {
	if (issue.code !== "invalid_type" || issue.message.startsWith("Invalid input")) return undefined
	return issue.message
}

/** One row per validator issue; an unexpected key gets its own row, under its container. */
function documentRows(issue: z.core.$ZodIssue): Row[] {
	if (issue.code === "custom") {
		const code = paramsOf(issue)["code"]
		return [
			{
				path: documentPathOf(issue.path),
				message: issue.message,
				...(typeof code === "string" ? { code } : {}),
			},
		]
	}
	if (issue.code === "unrecognized_keys") {
		return issue.keys.map((key) => ({
			path: documentPathOf([...issue.path, key]),
			message: SENTENCES.unexpectedField,
		}))
	}
	const message = authoredMessage(issue) ?? sentenceOf(issue, "document")
	return [{ path: documentPathOf(issue.path), message }]
}

/** The hint a core put on its first issue; it owns that sentence too (ADR-0024). */
function authoredHint(issue: z.core.$ZodIssue | undefined): string | undefined {
	if (issue?.code !== "custom") return undefined
	const hint = paramsOf(issue)["hint"]
	return typeof hint === "string" ? hint : undefined
}

/** The `invalid_input` a document's schema reports, under `document.` and never a flag. */
export function documentFailure(error: z.ZodError): AppError {
	return issueFailure(error.issues.flatMap(documentRows), authoredHint(error.issues[0]))
}
