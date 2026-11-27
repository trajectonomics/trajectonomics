/**
 * The pure decision rules for the OAuth gates. The request hook reads the request and the stored
 * grant, then asks these functions; it does not decide anything itself.
 *
 * RFC 8707 lets a client ask for more than one resource, but this platform issues a token for one
 * audience only (ADR 0001, gate 1). Two rules enforce that:
 * - a request may carry at most one `resource` value on the device, authorize and token endpoints;
 * - a refresh may not add a resource the original grant did not have, including the first one.
 *
 * A grant also has an absolute lifetime: rotation issues a new refresh token, but the grant's
 * approval time never moves, so the chain cannot be extended forever (gate 3).
 */

export type ResourceRejection = "multiple-resources" | "resource-widening"
export type GrantRejection = "grant-expired" | "grant-unknown"

/** True when the request carried more than one `resource` value, repeated or as a JSON array. */
export function resourceParameterRejection(values: readonly string[]): ResourceRejection | null {
	return values.length > 1 ? "multiple-resources" : null
}

/**
 * True when a refresh asks for a resource outside the original grant. An empty request is allowed:
 * the refresh keeps the grant's resources. A grant that had none cannot gain one on refresh.
 */
export function refreshResourceRejection(input: {
	requested: readonly string[]
	granted: readonly string[] | null | undefined
}): ResourceRejection | null {
	if (input.requested.length === 0) return null
	const granted = new Set(input.granted ?? [])
	for (const resource of input.requested) {
		if (!granted.has(resource)) return "resource-widening"
	}
	return null
}

/**
 * True when the grant's original approval is at least `lifetimeSeconds` old. A missing approval
 * record fails closed: without it the platform cannot prove the grant is inside its lifetime.
 */
export function grantLifetimeRejection(input: {
	approvedAt: Date | null | undefined
	now: Date
	lifetimeSeconds: number
}): GrantRejection | null {
	if (input.approvedAt === null || input.approvedAt === undefined) return "grant-unknown"
	const expiresAt = input.approvedAt.getTime() + input.lifetimeSeconds * 1_000
	return input.now.getTime() >= expiresAt ? "grant-expired" : null
}

/** Normalizes a parsed `resource` value (string, string array or absent) into a flat list. */
export function resourceValues(value: unknown): string[] {
	if (typeof value === "string") return value === "" ? [] : [value]
	if (!Array.isArray(value)) return []
	const values: string[] = []
	for (const item of value) {
		if (typeof item === "string" && item !== "") values.push(item)
	}
	return values
}

/**
 * Merges the same parameter seen through several parsers of one request (the raw query, the
 * parsed query, the raw body and `ctx.body`). A value that appears once in more than one source
 * is the same parameter seen twice, not two parameters, so it counts once: the count per value
 * is the maximum over the sources. A value repeated inside one source, or two sources that
 * disagree, both survive and make the combined count two.
 *
 * This is what the request hook needs: the raw body can hide a JSON array from a form parser,
 * and `ctx.body` can lose an unvalidated field, so reading every source and counting the union
 * closes the smuggling case without rejecting a normal single-value request.
 */
export function mergeResourceSources(sources: readonly (readonly string[])[]): string[] {
	const counts = new Map<string, number>()
	for (const source of sources) {
		const local = new Map<string, number>()
		for (const value of source) local.set(value, (local.get(value) ?? 0) + 1)
		for (const [value, count] of local) {
			counts.set(value, Math.max(counts.get(value) ?? 0, count))
		}
	}
	const merged: string[] = []
	for (const [value, count] of counts) {
		for (let index = 0; index < count; index += 1) merged.push(value)
	}
	return merged
}
