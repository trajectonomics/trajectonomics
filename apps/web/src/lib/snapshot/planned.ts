/**
 * One read the Plan asks for: the argv after `traj`, and the Scenarios whose Carry-in records the read
 * takes on standard input. An empty `carryInFor` means the read takes no Carry-in.
 */
export type PlannedRead = { argv: string[]; carryInFor: readonly string[] }

/** A read that takes no Carry-in. */
export function plainRead(argv: string[]): PlannedRead {
	return { argv, carryInFor: [] }
}
