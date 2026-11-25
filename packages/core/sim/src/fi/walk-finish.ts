import { type BufferFinding, breachAt } from "./buffer"
import type { RequirementTable } from "./required"
import type { WalkOutcome } from "./walk"
import type { DayInput, WalkInput } from "./walk-input"

/**
 * Ends a walk that no Shortfall stopped, and resolves its buffer findings by date (ADR 0012). A
 * candidate that builds its own windows takes them from the fire dates its walk reached, then checks
 * the buffer on the accessible net worth the walk recorded. A shared table has no trace: its
 * findings arrived during the walk in `early`, so both paths report the earliest breach or problem.
 */
export function finish(
	input: WalkInput,
	day: DayInput,
	early: BufferFinding | undefined,
): WalkOutcome {
	const { shared, forFires } = input.windows
	const windows = shared ?? forFires(day.point.gate?.fires() ?? new Map(), day.values)
	const finding = early ?? firstTraced(windows.requirement, day.trace)
	if (finding === undefined) return { kind: "survived", windows, point: day.point }
	return finding.kind === "breach"
		? { kind: "buffer", breach: finding.breach, windows }
		: { kind: "problem", problem: finding.problem }
}

/** The earliest breach or window problem among the recorded accessible net worths. */
function firstTraced(table: RequirementTable, trace: DayInput["trace"]): BufferFinding | undefined {
	for (const point of trace) {
		const checked = breachAt(table, point.date, point.accessible)
		if (checked.kind === "breach") return { kind: "breach", breach: checked.breach }
		if (checked.kind === "problem") return { kind: "problem", problem: checked.problem }
	}
	return undefined
}
