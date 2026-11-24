import type { DemoAccountIds } from "./scenario"

/**
 * The fictional Return model the demo's chance of success draws from. Every figure is invented, and the
 * id says so: it is shown on the Chance of success page beside the success share.
 */
export const DEMO_MODEL_ID = "illustrative-demo-model"

/** The Market paths the demo runs, and the seed they are drawn from, so the Demo snapshot is reproducible. */
export const DEMO_PATHS = 200
export const DEMO_SEED = "0123456789abcdef"

/** The weights sum to 2^32, as a Return model must. Three months in four are calm; one in four is a sell-off. */
const CALM = 3221225472
const SELL_OFF = 1073741824

/** The demo's Return model over its bank and fund accounts, in basis points a month: 100 is 1% over the month. */
export function demoReturnModel(ids: DemoAccountIds): Record<string, unknown> {
	return {
		id: DEMO_MODEL_ID,
		accounts: [ids.bank, ids.fund],
		buckets: [
			{ returnsBps: [20, 110], weight: CALM },
			{ returnsBps: [-40, -120], weight: SELL_OFF },
		],
	}
}
