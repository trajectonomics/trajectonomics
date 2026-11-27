/**
 * How a failed account deletion is read.
 *
 * Only a 4xx answer is the server refusing and leaving the account in place. A 5xx, a lost
 * response or no answer at all leaves the outcome unknown: the deletion may have happened before
 * the answer went missing, so the page must not claim either outcome.
 */
export type DeletionFailureOutcome = "refused" | "unconfirmed"

export function deletionFailureOutcome(error: unknown): DeletionFailureOutcome {
	const status = statusOf(error)
	return status >= 400 && status < 500 ? "refused" : "unconfirmed"
}

function statusOf(error: unknown): number {
	if (typeof error !== "object" || error === null) return 0
	const status = (error as { status?: unknown }).status
	return typeof status === "number" && Number.isFinite(status) ? status : 0
}
