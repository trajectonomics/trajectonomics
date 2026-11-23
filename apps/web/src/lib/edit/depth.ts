/**
 * The deepest a request body may nest. A document of a plan is a few levels deep; a body past this is
 * refused before a recursive schema reads it, because a body nested 100000 levels overflows the stack
 * of the parser and the server would answer its own HTML error page, with a stack trace, as a 500.
 */
export const MAX_BODY_DEPTH = 32

/**
 * Whether a parsed JSON value nests deeper than `limit` arrays and objects. Walks with its own stack, so
 * the walk itself cannot overflow, and stops at the first value past the limit. Only arrays and objects go
 * on the stack: a scalar is looked at where its parent is walked and never pushed, so a flat body of a
 * million numbers costs one pass.
 */
export function nestsPast(value: unknown, limit: number = MAX_BODY_DEPTH): boolean {
	if (!isContainer(value)) return false
	const pending: { container: object; depth: number }[] = [{ container: value, depth: 1 }]
	for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
		if (next.depth > limit) return true
		for (const child of containersIn(next.container)) {
			pending.push({ container: child, depth: next.depth + 1 })
		}
	}
	return false
}

/** An array or an object: the only values a body nests through. */
function isContainer(value: unknown): value is object {
	return typeof value === "object" && value !== null
}

/** The arrays and objects one level below a container; its scalars are looked at here and go no further. */
function containersIn(container: object): object[] {
	const children: unknown[] = Array.isArray(container) ? container : Object.values(container)
	return children.filter(isContainer)
}
