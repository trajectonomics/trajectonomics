/*
 * The two routing lists whose items have no id (cli ADR-0070), so the Override grammar addresses an item by its
 * position there, which the dotted-path grammar of `path.ts` otherwise never does (ADR-0024).
 */

/**
 * The routing lists whose items have no id, so a `--set` addresses an item by its position instead
 * (cli ADR-0070): `cashflow.surplus.0.share` is the first step's share and `cashflow.withdraw.1.downTo`
 * the second entry's floor. A position counts from 0 and must name an item the list holds.
 */
export const POSITIONAL_LISTS: readonly (readonly string[])[] = [
	["cashflow", "surplus"],
	["cashflow", "withdraw"],
]

/** Whether the list at `prefix` is addressed by position. */
export function isPositionalList(prefix: readonly string[]): boolean {
	return POSITIONAL_LISTS.some(
		(list) => list.length === prefix.length && list.every((part, at) => prefix[at] === part),
	)
}

/** The index a segment names in a positional list, or null when it is not a canonical index. */
export function positionOf(segment: string, length: number): number | null {
	if (!/^(0|[1-9][0-9]*)$/.test(segment)) return null
	const at = Number(segment)
	return at < length ? at : null
}
