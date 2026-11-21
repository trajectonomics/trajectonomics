/**
 * The Carry-in records that a read names, from a list the caller supplied: each record whose
 * `scenario` is one of the names. A record for any other Scenario is left out, because the CLI refuses
 * a record for a Scenario the command does not prepare.
 */
export function carryInFor(records: readonly unknown[], names: readonly string[]): unknown[] {
	return records.filter((record) => {
		if (typeof record !== "object" || record === null || !("scenario" in record)) return false
		return typeof record.scenario === "string" && names.includes(record.scenario)
	})
}
