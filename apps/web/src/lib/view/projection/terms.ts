/** The terms a net worth chart shows: future money, today's money, or both. */
export const TERMS = ["both", "nominal", "real"] as const

/** One of the terms a net worth chart can show. */
export type Terms = (typeof TERMS)[number]

/** The terms the address bar asks for, or "both" when it names none this page knows. */
export function parseTerms(raw: string): Terms {
	return TERMS.find((term) => term === raw) ?? "both"
}
