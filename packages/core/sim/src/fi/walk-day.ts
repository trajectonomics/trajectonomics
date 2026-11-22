import type { DatedEvent } from "../engine/events"
import { closeReturnsOn, hasSettlement } from "../engine/levy-set"
import { processDate } from "../engine/occurrence"
import { isSafeInteger, overflow } from "../engine/overflow"
import type { DateString } from "../types"
import type { ProjectionProblem } from "../types/projection"
import { type BufferBreach, checkBuffer } from "./buffer"
import { lockedOrAbsentAssets } from "./undrawable"
import type { Shortfall, WalkInput } from "./walk"

type DayOutcome =
	| { readonly kind: "ok"; readonly breach?: BufferBreach }
	| { readonly kind: "shortfall"; readonly shortfall: Shortfall }
	| { readonly kind: "problem"; readonly problem: ProjectionProblem }

function processFlows(
	input: WalkInput,
	date: DateString,
	dayEvents: readonly DatedEvent[],
	settled: boolean,
): DayOutcome {
	const { scenario, point } = input
	if (dayEvents.length === 0 && !settled) return { kind: "ok" }
	const outcome = processDate(point.states, scenario, date, dayEvents, point.levies)
	point.gate?.record(outcome.totals)
	if (outcome.problem !== undefined) return { kind: "problem", problem: outcome.problem }
	if (outcome.runsOut === undefined) return { kind: "ok" }
	if (!isSafeInteger(outcome.runsOut.unmet)) return { kind: "problem", problem: overflow(date) }
	const undrawable = lockedOrAbsentAssets(point.states, scenario, date)
	if ("problem" in undrawable) return { kind: "problem", problem: undrawable.problem }
	return {
		kind: "shortfall",
		shortfall: {
			date: outcome.runsOut.date,
			unmet: outcome.runsOut.unmet,
			undrawable: undrawable.value,
		},
	}
}

export function processDay(
	input: WalkInput,
	date: DateString,
	dayEvents: readonly DatedEvent[],
): DayOutcome {
	const { levies, states, gate } = input.point
	if (levies !== undefined) closeReturnsOn(levies, states, date)
	const settled = levies !== undefined && hasSettlement(levies, date)
	const landing = gate === undefined ? dayEvents : gate.apply(states, date, dayEvents, settled)
	const flows = processFlows(input, date, landing, settled)
	if (flows.kind !== "ok" || input.requirement.months === 0) return flows
	const checked = checkBuffer(input.point.states, date, input.requirement)
	if (checked.kind === "problem") return { kind: "problem", problem: checked.problem }
	if (checked.kind === "breach") return { kind: "ok", breach: checked.breach }
	return { kind: "ok" }
}
