/**
 * The deepest a request body may nest. A document of a plan is a few levels deep; a body past this is
 * refused before a recursive schema reads it, because a body nested 100000 levels overflows the stack
 * of the parser and the server would answer its own HTML error page, with a stack trace, as a 500.
 */
export const MAX_BODY_DEPTH = 32

/**
 * Whether a parsed JSON value nests deeper than `limit` arrays and objects. Walks with its own stack, so
 * the walk itself cannot overflow, and stops at the first value past the limit.
 */
export function nestsPast(value: unknown, limit: number = MAX_BODY_DEPTH): boolean {
	const pending: { value: unknown; depth: number }[] = [{ value, depth: 0 }]
	for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
		if (typeof next.value !== "object" || next.value === null) continue
		const depth = next.depth + 1
		if (depth > limit) return true
		for (const child of Object.values(next.value)) pending.push({ value: child, depth })
	}
	return false
}
