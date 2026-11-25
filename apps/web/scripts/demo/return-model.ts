import type { DemoAccountIds } from "./scenario"

/**
 * The fictional Return model the demo's chance of success draws from. Every figure is invented, and the
 * id says so: it is shown on the Chance of success page beside the success share.
 */
export const DEMO_MODEL_ID = "illustrative-demo-model"

/** The Market paths the demo runs, and the seed they are drawn from, so the Demo snapshot is reproducible. */
export const DEMO_PATHS = 200
export const DEMO_SEED = "0123456789abcdef"

/**
 * The weights sum to 2^32, as a Return model must: 23 months in 32 are calm, 5 a sell-off and 4 a crash. The
 * crash is what makes the demo's base Scenario fail a few paths, so its share is not a perfect 100.00%.
 */
const CALM = 3087007744
const SELL_OFF = 671088640
const CRASH = 536870912

/** The demo's Return model over its bank and fund accounts, in basis points a month: 100 is 1% over the month. */
export function demoReturnModel(ids: DemoAccountIds): Record<string, unknown> {
	return {
		id: DEMO_MODEL_ID,
		accounts: [ids.bank, ids.fund],
		buckets: [
			{ returnsBps: [20, 110], weight: CALM },
			{ returnsBps: [-40, -120], weight: SELL_OFF },
			{ returnsBps: [-350, -900], weight: CRASH },
		],
	}
}
