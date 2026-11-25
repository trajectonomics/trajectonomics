import { isPlainObject } from "../../json"
import { canonicalJson } from "../../store/canonical"
import { ALLOWANCE_FLAGS, allowancesOf } from "./allowances"
import type { TaxRequest } from "./flags"
import { returnOfStored, storedReturnOf } from "./stored-return"
import { type StoredTax, storedTax } from "./stored-schema"

/** The stored profile of a request: every deduction of zero is left out, so equal requests are equal text. */
export function storedTaxOf(request: TaxRequest): StoredTax {
	const stored: { -readonly [K in keyof StoredTax]: StoredTax[K] } = {
		tax: request.jurisdiction,
		filingStatus: request.filingStatus,
		children: request.children,
		childrenAtHigherRate: request.childrenAtHigherRate,
	}
	if (request.claimsHolder !== undefined) stored.claimsHolder = request.claimsHolder
	for (const field of ALLOWANCE_FLAGS) {
		if (request.allowances[field] > 0) stored[field] = request.allowances[field]
	}
	if (request.returns !== undefined) {
		stored.returns = Object.fromEntries(
			Object.entries(request.returns).map(([person, claims]) => [person, storedReturnOf(claims)]),
		)
	}
	return stored
}

/** The request a stored profile states, with a `0` for each deduction it leaves out. */
export function requestOfStored(stored: StoredTax): TaxRequest {
	return {
		jurisdiction: stored.tax,
		filingStatus: stored.filingStatus,
		children: stored.children,
		childrenAtHigherRate: stored.childrenAtHigherRate,
		allowances: allowancesOf(stored),
		...(stored.claimsHolder === undefined ? {} : { claimsHolder: stored.claimsHolder }),
		...(stored.returns === undefined
			? {}
			: {
					returns: Object.fromEntries(
						Object.entries(stored.returns).map(([person, claims]) => [
							person,
							returnOfStored(claims),
						]),
					),
				}),
	}
}

/** The stored form: RFC 8785 canonical text, as every Scenario row keeps its document. */
export function canonicalTax(stored: StoredTax): string {
	return canonicalJson(stored, "tax")
}

/** The profile a row keeps, parsed from its stored canonical text; a row that holds none gives `null`. */
export function parsedTax(text: string | null): StoredTax | null {
	if (text === null) return null
	const parsed: unknown = JSON.parse(text)
	const checked = storedTax.safeParse(parsed)
	if (!isPlainObject(parsed) || !checked.success) {
		throw new Error("A Scenario row holds a tax profile this build cannot read.")
	}
	return checked.data
}
