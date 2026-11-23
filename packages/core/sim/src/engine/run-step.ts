import type { MilestoneGate } from "../milestone/gate"
import type { DateString, Scenario } from "../types"
import type { ProjectionProblem } from "../types/projection"
import type { DatedEvent } from "./events"
import { closeReturnsOn, hasSettlement, type LevySet } from "./levy-set"
import { type LiabilityLedger, recordMoves } from "./liability-ledger"
import type { DayTotals, EngineRunsOut } from "./occurrence"
import { processDate } from "./occurrence"
import { isSafeInteger, overflow } from "./overflow"
import type { EngineResult } from "./result"
import { type EngineSnapshot, snapshot } from "./snapshot"
import type { StateMap } from "./state"

export interface RunAccumulator {
	readonly snapshots: EngineSnapshot[]
	readonly totals: DayTotals[]
	readonly wanted: ReadonlySet<DateString>
	readonly levies: LevySet | undefined
	readonly gate: MilestoneGate | undefined
	readonly ledger: LiabilityLedger | undefined
	/** Whether each date records its cash-flow lines; only the breakdown option turns it on. */
	readonly breakdown: boolean
}

function addSnapshot(
	snapshots: EngineSnapshot[],
	states: StateMap,
	date: DateString,
): ProjectionProblem | undefined {
	const outcome = snapshot(states, date)
	if (outcome.problem !== undefined) return outcome.problem
	snapshots.push(outcome.snapshot!)
	return undefined
}

function finishRunout(acc: RunAccumulator, states: StateMap, runsOut: EngineRunsOut): EngineResult {
	if (!isSafeInteger(runsOut.unmet)) return { ok: false, problem: overflow(runsOut.date) }
	const problem = addSnapshot(acc.snapshots, states, runsOut.date)
	if (problem !== undefined) return { ok: false, problem }
	return { ok: true, run: { snapshots: acc.snapshots, totals: acc.totals, runsOut } }
}

function handleDay(
	acc: RunAccumulator,
	states: StateMap,
	scenario: Scenario,
	date: DateString,
	events: readonly DatedEvent[],
): EngineResult | undefined {
	const settlement = acc.levies !== undefined && hasSettlement(acc.levies, date)
	if (events.length === 0 && !settlement) return undefined
	const outcome = processDate(states, scenario, date, events, acc.levies, acc.breakdown)
	acc.totals.push(outcome.totals)
	acc.gate?.record(outcome.totals)
	if (acc.ledger !== undefined) recordMoves(acc.ledger, states, outcome.totals)
	if (outcome.problem !== undefined) return { ok: false, problem: outcome.problem }
	if (outcome.runsOut !== undefined) return finishRunout(acc, states, outcome.runsOut)
	return undefined
}

function handleSnapshot(
	acc: RunAccumulator,
	states: StateMap,
	date: DateString,
): EngineResult | undefined {
	if (!acc.wanted.has(date)) return undefined
	const problem = addSnapshot(acc.snapshots, states, date)
	if (problem !== undefined) return { ok: false, problem }
	return undefined
}

export function stepDate(
	acc: RunAccumulator,
	states: StateMap,
	scenario: Scenario,
	date: DateString,
	events: readonly DatedEvent[],
): EngineResult | undefined {
	if (acc.levies !== undefined) closeReturnsOn(acc.levies, states, date)
	const settled = acc.levies !== undefined && hasSettlement(acc.levies, date)
	const landing = acc.gate === undefined ? events : acc.gate.apply(states, date, events, settled)
	const dayResult = handleDay(acc, states, scenario, date, landing)
	if (dayResult !== undefined) return dayResult
	return handleSnapshot(acc, states, date)
}
