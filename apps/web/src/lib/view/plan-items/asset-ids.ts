/**
 * The ids a real asset's items take, from the id of its Account (cli ADR 0060). The ids are a convention the
 * Dashboard writes and reads to recognise an asset in a document; `traj` never sees them. The costs of buying
 * and selling are the Dashboard's own two items beside the ones the CLI's worked example names.
 */

/** The ids of every item of the real asset whose Account has this id. */
export interface AssetIds {
	readonly account: string
	readonly purchase: string
	readonly buyCost: string
	readonly running: string
	readonly rent: string
	readonly sale: string
	readonly saleCost: string
	/** The loan's liability Account. */
	readonly loan: string
	readonly loanPayment: string
	readonly loanDraw: string
	readonly loanPayoff: string
}

/** The ids of the items of the asset with that Account id. */
export function assetIds(id: string): AssetIds {
	return {
		account: id,
		purchase: `${id}-purchase`,
		buyCost: `${id}-buying-cost`,
		running: `${id}-running`,
		rent: `${id}-rent`,
		sale: `${id}-sale`,
		saleCost: `${id}-selling-cost`,
		loan: `${id}-loan`,
		loanPayment: `${id}-loan-payment`,
		loanDraw: `${id}-loan-draw`,
		loanPayoff: `${id}-loan-payoff`,
	}
}

/** Every id the asset may hold, in the order a card lists its items, the Account first. */
export function allAssetIds(id: string): string[] {
	return Object.values(assetIds(id))
}

/** The id for a new asset: the base, or the first `base-2`, `base-3`, … none of whose items the document holds. */
export function newAssetId(base: string, taken: readonly string[]): string {
	for (let index = 1; ; index++) {
		const id = index === 1 ? base : `${base}-${index}`
		if (!allAssetIds(id).some((candidate) => taken.includes(candidate))) return id
	}
}
