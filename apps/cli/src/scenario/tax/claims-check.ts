import { type AppError, fail } from "../../errors"
import type { Stated } from "./claims-values"
import type { Couple } from "./couple"
import type { ReturnClaims } from "./flags"
import { flagOf } from "./flags"

/** The refusal for a person-qualified value with no separate Return to put it on. */
function noReturn(field: string, person: string): AppError {
	return fail("invalid_input", {
		path: field,
		message: `${flagOf(field)}: "${person}" is a person-qualified value, which needs --filing-status married_separate and a household with a partner and Owners.`,
		hint: "State the value bare for the holder, or file separately with a partner and Owners in the household.",
	})
}

/** Refuses a person-qualified value that names nobody this Return can file for. */
export function checkedPersons(stated: Stated, pair: Couple | null): AppError | null {
	const known = new Set(pair === null ? [] : [pair.holder.id, pair.partner.id])
	for (const [field, values] of stated) {
		for (const person of values.keys()) {
			if (person !== "" && (pair === null || !known.has(person))) return noReturn(field, person)
		}
	}
	return null
}

/** A Return's higher-rate children cannot exceed the children it counts. */
export function checkedClaims(claims: ReturnClaims, person: string): AppError | null {
	if (claims.childrenAtHigherRate <= claims.children) return null
	const whose = person === "" ? "" : ` for "${person}"`
	return fail("invalid_input", {
		message: `--children-at-higher-rate${whose} counts children that --children also counts, so it cannot exceed it.`,
		path: "childrenAtHigherRate",
	})
}
