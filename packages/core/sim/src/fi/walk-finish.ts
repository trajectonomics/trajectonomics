import { type BufferBreach, breachAt } from "./buffer"
import type { WalkOutcome } from "./walk"
import type { DayInput, WalkInput } from "./walk-input"

/**
 * Ends a walk that no Shortfall stopped. A candidate that builds its own windows (ADR 0012) takes
 * them from the fire dates its walk reached, then checks the buffer on the accessible net worth the
 * walk recorded, so the first breach is the same one a check during the walk would find.
 */
export function finish(
	input: WalkInput,
	day: DayInput,
	breach: BufferBreach | undefined,
): WalkOutcome {
	const { shared, forFires } = input.windows
	const windows = shared ?? forFires(day.point.gate?.fires() ?? new Map())
	let first = breach
	for (const point of day.table === undefined ? day.trace : []) {
		const checked = breachAt(windows.requirement, point.date, point.accessible)
		if (checked.kind === "problem") return checked
		if (checked.kind === "breach") {
			first = checked.breach
			break
		}
	}
	return first === undefined
		? { kind: "survived", windows }
		: { kind: "buffer", breach: first, windows }
}
