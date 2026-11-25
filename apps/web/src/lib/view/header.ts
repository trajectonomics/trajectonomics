import type { Snapshot } from "../contract"
import { formatDate } from "../format"

/** The line under the brand: the As-of, the currency and the traj version the Snapshot names. */
export interface HeaderLine {
	readonly asOf: string
	readonly currency: string | null
	readonly cliVersion: string
}

/**
 * The header's facts from a Snapshot. The currency is the first one net worth states, else the one
 * a comparison states; a Snapshot with neither names none, and the header then says so.
 */
export function headerLine(snapshot: Snapshot): HeaderLine {
	return {
		asOf: formatDate(snapshot.params.asOf),
		currency: currencyOf(snapshot),
		cliVersion: snapshot.cliVersion,
	}
}

function currencyOf(snapshot: Snapshot): string | null {
	const netWorth = snapshot.reads.netWorth
	const fromNetWorth = netWorth.ok ? netWorth.data.totals?.[0]?.currency : undefined
	if (fromNetWorth) return fromNetWorth
	const compare = snapshot.reads.compare
	return compare?.ok ? compare.data.currency : null
}
