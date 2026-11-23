import { SNAPSHOT_VERSION, type Snapshot, type SnapshotReads } from "../contract"
import type { PlanParams } from "./params"

/** What the document is assembled from: the planned parameters, the resolved names, and every Read. */
export type AssembleInput = {
	params: PlanParams
	scenarios: string[]
	historyDates: string[]
	cliVersion: string
	reads: SnapshotReads
}

/** Puts the reads and the resolved parameters into a Snapshot, version 1. Pure: no I/O. */
export function assembleSnapshot(input: AssembleInput): Snapshot {
	const { params } = input
	return {
		snapshotVersion: SNAPSHOT_VERSION,
		params: {
			asOf: params.asOf,
			horizon: params.horizon,
			scenarios: [...input.scenarios],
			compare: params.compare,
			birthDate: params.birthDate,
			ages: [...params.ages],
			historyDates: [...input.historyDates],
			allowances: params.allowances,
		},
		cliVersion: input.cliVersion,
		reads: input.reads,
	}
}
