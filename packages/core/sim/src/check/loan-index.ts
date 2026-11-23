import { isRecord } from "./shape"

/** The raw fields of an Account that a loan Flow reads. */
export interface LoanTarget {
	readonly kind: unknown
	readonly rate: unknown
	readonly compounding: unknown
}

export type LoanIndex = ReadonlyMap<string, LoanTarget>

/** Declared Accounts (first declaration wins) with the fields a loan Flow reads. */
export function loanIndex(accounts: unknown): LoanIndex {
	const index = new Map<string, LoanTarget>()
	if (!Array.isArray(accounts)) return index
	for (const item of accounts) {
		if (isRecord(item) && typeof item["id"] === "string" && !index.has(item["id"])) {
			const { kind, rate, compounding } = item
			index.set(item["id"], { kind, rate, compounding })
		}
	}
	return index
}
