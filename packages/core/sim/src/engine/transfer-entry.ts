import type { AccountId } from "../types"

/** One transfer Occurrence a date landed: what it plans to move, before the source and target limit it (ADR 0031). */
export interface TransferEntry {
	/** The transfer Flow's id. */
	readonly flow: string
	readonly source: AccountId
	readonly target: AccountId
	readonly amount: bigint
	/** Tally the source's Realised gain on the amount moved, as a sale. */
	readonly realise: boolean
}
