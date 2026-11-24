import type { AccountId, DateString } from "../types"
import type { DayTotals } from "./occurrence"
import type { StateMap } from "./state"
import { valuation } from "./value"

/**
 * Read only when the statement option is on. A liability's owed amount changes only on a date it
 * borrows (a planned withdrawal) or is paid (a debt payment): `surplus`, `withdraw` and `contribute`
 * refuse liabilities. So the ledger reads each liability on those dates, after the day's flows.
 */
export interface LiabilityLedger {
	/** The owed amount after the liability's last move. */
	readonly owed: Map<AccountId, bigint>
	/** The first Landed date each liability reached zero after being above zero. */
	readonly paidOff: Map<AccountId, DateString>
}

/** Every liability owes its Baseline balance on the Timeline start, before any start-date flow. */
export function openLedger(states: StateMap, start: DateString): LiabilityLedger {
	const owed = new Map<AccountId, bigint>()
	for (const [id, state] of states) {
		if (state.rule.kind === "liability") owed.set(id, valuation(state, start))
	}
	return { owed, paidOff: new Map() }
}

/** Records the date's moves: a liability whose owed amount falls from above zero to zero is paid off. */
export function recordMoves(ledger: LiabilityLedger, states: StateMap, day: DayTotals): void {
	const moved = new Set([...day.drawnBy.keys(), ...day.paidBy.keys(), ...day.transferredTo.keys()])
	for (const id of moved) {
		const after = valuation(states.get(id)!, day.date)
		const before = ledger.owed.get(id) ?? 0n
		ledger.owed.set(id, after)
		if (before > 0n && after === 0n && !ledger.paidOff.has(id)) {
			ledger.paidOff.set(id, day.date)
		}
	}
}
