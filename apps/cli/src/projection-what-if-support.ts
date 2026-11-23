import { runBody, tableOf } from "./projection-run-support"

/** The overrides and removals a result echoes, read from its JSON. */
export type Echoed = {
	removals: string[]
	overrides: { path: string; value: unknown }[]
	scenario: { contentHash: string; effectiveContentHash: string }
	annual?: never
}

export function echoed(res: { out: string }): Echoed {
	return JSON.parse(res.out) as Echoed
}

/** The closing net worth of the one annual roll-up a plain run reports. */
export function closingOf(res: { out: string }): string {
	const body = runBody(res as Parameters<typeof runBody>[0])
	const annual = tableOf(body, "annual")
	const row = annual.rows[0] as { closingNetWorth: string }
	return row.closingNetWorth
}
