import { breachAt, type WindowEvent } from "./buffer"
import type { RequirementTable } from "./required"
import type { WalkOutcome } from "./walk"
import type { DayInput, WalkInput } from "./walk-input"

/**
 * Ends a walk that no Shortfall stopped, and resolves its window events by date (ADR 0012). A
 * candidate that builds its own windows takes them from the fire dates its walk reached, then checks
 * the buffer on the accessible net worth the walk recorded. A shared table has no trace: its events
 * arrived during the walk in `early`, so both paths report the earliest breach or problem.
 */
export function finish(
	input: WalkInput,
	day: DayInput,
	early: WindowEvent | undefined,
): WalkOutcome {
	const { shared, forFires } = input.windows
	const windows = shared ?? forFires(day.point.gate?.fires() ?? new Map(), day.values)
	const event = early ?? firstTraced(windows.requirement, day.trace)
	if (event === undefined) return { kind: "survived", windows, point: day.point }
	return event.kind === "breach"
		? { kind: "buffer", breach: event.breach, windows }
		: { kind: "problem", problem: event.problem }
}

/** The earliest breach or window problem among the recorded accessible net worths. */
function firstTraced(table: RequirementTable, trace: DayInput["trace"]): WindowEvent | undefined {
	for (const point of trace) {
		const checked = breachAt(table, point.date, point.accessible)
		if (checked.kind === "breach") return { kind: "breach", breach: checked.breach }
		if (checked.kind === "problem") return { kind: "problem", problem: checked.problem }
	}
	return undefined
}
