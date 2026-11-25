import type { Stated } from "./claims-values"
import type { Couple } from "./couple"
import type { NamedValue, ReturnClaims } from "./flags"

/** Writes one stated value into a Return's claims. */
function applyClaim(claims: ReturnClaims, field: string, value: number): void {
	if (field === "children" || field === "childrenAtHigherRate") claims[field] = value
	else claims.allowances[field as keyof ReturnClaims["allowances"]] = value
}

/** One stated value on the flat claims and, when separate, on the Return it names. */
function applyOne(
	field: string,
	person: string,
	value: number,
	flat: ReturnClaims,
	returns: Map<string, ReturnClaims>,
	pair: Couple | null,
): void {
	if (pair === null) {
		applyClaim(flat, field, value)
		return
	}
	applyClaim(returns.get(person === "" ? pair.holder.id : person)!, field, value)
	if (person === "") applyClaim(flat, field, value)
}

/** Lays every stated value over the flat claims and, when separate, over each Return's. */
export function applyStated(
	stated: Stated,
	flat: ReturnClaims,
	returns: Map<string, ReturnClaims>,
	pair: Couple | null,
): void {
	for (const [field, values] of stated) {
		for (const [person, value] of values) applyOne(field, person, value, flat, returns, pair)
	}
}

/**
 * The values that need a person's Return, in the flags' own order: each stated with a person, and
 * with a `pair` each bare one too, which names the holder.
 */
export function namedValues(stated: Stated, pair: Couple | null): NamedValue[] {
	const bare = (field: string): NamedValue[] =>
		pair === null ? [] : [{ field, person: pair.holder.id, bare: true }]
	return [...stated].flatMap(([field, values]) =>
		[...values.keys()].flatMap((person) => (person === "" ? bare(field) : [{ field, person }])),
	)
}
