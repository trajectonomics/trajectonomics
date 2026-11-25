import type { ChanceOfSuccessOptions, ReturnModel } from "../types"

const HALF = 2147483648

/** A flat month and a -15% month, equally weighted, over the freelancer's brokerage. */
const market: ReturnModel = {
	id: "parity-market",
	accounts: ["brokerage"],
	buckets: [
		{ returnsBps: [0], weight: HALF },
		{ returnsBps: [-1500], weight: HALF },
	],
}

export const freelancerChance: ChanceOfSuccessOptions = {
	model: market,
	seed: "0123456789abcdef",
	paths: 4,
}
