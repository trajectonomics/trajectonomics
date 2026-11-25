import type { AppError } from "../../errors"
import { checkedClaims, checkedPersons } from "./claims-check"
import { claimsOfRequest, seedReturns, zeroClaims } from "./claims-seed"
import type { Stated } from "./claims-values"
import type { Couple } from "./couple"
import type { ReturnClaims, TaxRequest, ThFilingStatus } from "./flags"

/** Writes one stated value into a Return's claims. */
function applyClaim(claims: ReturnClaims, field: string, value: number): void {
	if (field === "children" || field === "childrenAtHigherRate") claims[field] = value
	else claims.allowances[field as keyof ReturnClaims["allowances"]] = value
}

/** The profile fields the caller stated with a person, in the flags' own order. */
function personsOf(stated: Stated): string[] {
	return [...stated]
		.filter(([, values]) => [...values.keys()].some((person) => person !== ""))
		.map(([field]) => field)
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
function applyStated(
	stated: Stated,
	flat: ReturnClaims,
	returns: Map<string, ReturnClaims>,
	pair: Couple | null,
): void {
	for (const [field, values] of stated) {
		for (const [person, value] of values) applyOne(field, person, value, flat, returns, pair)
	}
}

/** The request the resolved claims state: one Return, or one claim set per Return of a separate filing. */
function assembled(
	status: ThFilingStatus,
	base: TaxRequest | undefined,
	flat: ReturnClaims,
	returns: Map<string, ReturnClaims>,
	pair: Couple | null,
): TaxRequest | AppError {
	const jurisdiction = base?.jurisdiction ?? "th-2026"
	if (pair === null) {
		const problem = checkedClaims(flat, "")
		return (
			problem ?? { jurisdiction, filingStatus: status, ...flat, allowances: { ...flat.allowances } }
		)
	}
	for (const [person, claims] of returns) {
		const problem = checkedClaims(claims, person)
		if (problem !== null) return problem
	}
	const holder = returns.get(pair.holder.id)!
	return {
		jurisdiction,
		filingStatus: status,
		children: holder.children,
		childrenAtHigherRate: holder.childrenAtHigherRate,
		allowances: { ...holder.allowances },
		returns: Object.fromEntries(returns),
	}
}

/**
 * The request the flags state over an optional base (cli ADR-0075). A bare value names the holder; a person-qualified
 * one needs `married_separate` with a partner, and is refused otherwise. Each Return's children default to 0.
 */
export function requestOfClaims(input: {
	status: ThFilingStatus
	couple: Couple | null
	stated: Stated
	base?: TaxRequest | undefined
}): TaxRequest | AppError {
	const pair = input.status === "married_separate" ? input.couple : null
	const refused = checkedPersons(input.stated, pair)
	if (refused !== null) return refused
	const flat = input.base === undefined ? zeroClaims() : claimsOfRequest(input.base)
	const returns = seedReturns(pair, input.base, flat)
	applyStated(input.stated, flat, returns, pair)
	const request = assembled(input.status, input.base, flat, returns, pair)
	if ("jurisdiction" in request) {
		const persons = personsOf(input.stated)
		if (persons.length > 0) request.persons = persons
	}
	return request
}
