/**
 * The decision rules for an `oauthConsent` row.
 *
 * A consent is one grant's approval record, keyed by user and client. Two machines of the same
 * user can approve the same client, so the row must hold the union of what each approval asked
 * for, and only one row may exist for one user and client. Approving a device code must happen
 * before the code can be redeemed, and only for a code that is pending, unexpired and claimed by
 * the person approving it.
 *
 * This module is pure: no I/O, no clock, no environment.
 */

export type ConsentRow = {
	id: string
	scopes?: unknown
	resources?: unknown
	createdAt?: unknown
}

/** Why a device approval may not record a consent. `null` means it may. */
export type DeviceApprovalRejection =
	| "no-session"
	| "not-pending"
	| "expired"
	| "not-owner"
	| "no-scope"

/**
 * True when the signed-in user may approve this device code. The library's own approve endpoint
 * re-checks the same four things; the before-hook must check them first, because it creates the
 * consent before the endpoint flips the code to `approved`. A code that is not claimed by the
 * session user cannot be approved, so no consent may be recorded for one.
 */
export function deviceApprovalRejection(input: {
	sessionUserId: string | undefined
	deviceUserId: string | null | undefined
	status: string | null | undefined
	expiresAt: Date | null | undefined
	scope: string | null | undefined
	now: Date
}): DeviceApprovalRejection | null {
	if (input.sessionUserId === undefined || input.sessionUserId === "") return "no-session"
	if (input.status !== "pending") return "not-pending"
	if (input.expiresAt === null || input.expiresAt === undefined) return "expired"
	if (input.expiresAt.getTime() <= input.now.getTime()) return "expired"
	if (input.deviceUserId !== input.sessionUserId) return "not-owner"
	if (input.scope === null || input.scope === undefined || input.scope.trim() === "")
		return "no-scope"
	return null
}

/**
 * The union of every scope list, in first-seen order. A second approval of the same client must
 * not narrow the first: an approval on one machine cannot drop a scope another machine holds.
 */
export function unionValues(lists: readonly (readonly string[])[]): string[] {
	const seen = new Set<string>()
	const union: string[] = []
	for (const list of lists) {
		for (const value of list) {
			if (value === "" || seen.has(value)) continue
			seen.add(value)
			union.push(value)
		}
	}
	return union
}

/** The timestamp a consent row was approved, or `null` when it cannot be read. */
export function approvalTime(value: unknown): Date | null {
	if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
	if (typeof value !== "string") return null
	const parsed = new Date(value)
	return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * The row to keep when several consents exist for one user and client. The oldest approval wins,
 * so merging never moves `createdAt` forward; equal timestamps break on the smallest id, so two
 * concurrent dedupe passes choose the same row and converge.
 */
export function pickConsentKeeper(rows: readonly ConsentRow[]): string | null {
	let keeper: { id: string; time: number } | null = null
	for (const row of rows) {
		if (typeof row.id !== "string" || row.id === "") continue
		const time = approvalTime(row.createdAt)?.getTime() ?? 0
		if (keeper === null || time < keeper.time || (time === keeper.time && row.id < keeper.id)) {
			keeper = { id: row.id, time }
		}
	}
	return keeper?.id ?? null
}
