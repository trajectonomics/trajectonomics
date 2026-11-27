import type { Snapshot } from "../../contract"
import { formatDate } from "../../format"

/** One line of "This Snapshot": a label and its value as the Snapshot states it. */
export interface FactLine {
	readonly label: string
	readonly value: string
}

/** The parameters, version and CLI version of a Snapshot, in the order the page lists them. */
export function snapshotFacts(snapshot: Snapshot): readonly FactLine[] {
	const { params } = snapshot
	return [
		{ label: "As-of", value: formatDate(params.asOf) },
		{ label: "Horizon", value: formatDate(params.horizon) },
		{ label: "Plans", value: listOf(params.scenarios, "None") },
		{
			label: "Compared",
			value: params.compare === null ? "None" : `${params.compare.a} and ${params.compare.b}`,
		},
		{
			label: "Birth date",
			value: params.birthDate === null ? "Not given" : formatDate(params.birthDate),
		},
		{ label: "Ages", value: listOf(params.ages.map(String), "None") },
		{ label: "History dates", value: `${params.historyDates.length} month-ends` },
		{ label: "Version of these figures", value: String(snapshot.snapshotVersion) },
		{ label: "traj version", value: snapshot.cliVersion },
	]
}

function listOf(values: readonly string[], empty: string): string {
	return values.length === 0 ? empty : values.join(", ")
}
