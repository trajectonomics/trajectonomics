import type { CarryInRecord } from "../../contract"
import { formatDate } from "../../format"

/** One Carry-in record as the page echoes it: where its tallies came from and what was prepaid. */
export interface CarryInRow {
	readonly key: string
	readonly levy: string
	readonly periodStart: string
	readonly source: string
	readonly prepaid: string
	readonly tallies: readonly CarryInTally[]
}

/** One tallied class of a record: its label, the basis it tallies under and its amount. */
export interface CarryInTally {
	readonly key: string
	readonly label: string
	readonly basis: string
	readonly amount: string
}

/** The Carry-in records a projection echoes, as table rows. */
export function carryInRows(records: readonly CarryInRecord[]): readonly CarryInRow[] {
	return records.map((record) => ({
		key: `${record.levy}-${record.periodStart}`,
		levy: record.levy,
		periodStart: formatDate(record.periodStart),
		source: record.source,
		prepaid: record.prepaid,
		tallies: record.tallies.map((tally) => ({
			key: `${record.levy}-${record.periodStart}-${tally.label}`,
			label: tally.label,
			basis: tally.basis,
			amount: tally.amount,
		})),
	}))
}
