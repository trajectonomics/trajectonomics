import type { AccountId, DateString } from "../types"
import type { ProjectionProblem } from "../types/projection"
import type { DayLines } from "./day-lines"

export interface DayTotals {
	readonly date: DateString
	/** Planned gross income before Prepayment. */
	readonly income: bigint
	readonly expense: bigint
	readonly contributions: bigint
	/** Employer Contributions landed on this date: money into Accounts that never passed through cashflow (ADR 0026). */
	readonly employer: bigint
	/** Planned withdrawals landed on this date. They are cash, not income, and not Available cashflow. */
	readonly withdrawals: bigint
	/** The planned withdrawals on this date, by the liability each one borrowed from. */
	readonly drawnBy: ReadonlyMap<AccountId, bigint>
	/** The debt payments on this date, by the liability each one paid; only nonzero payments. */
	readonly paidBy: ReadonlyMap<AccountId, bigint>
	readonly unfunded: ReadonlyMap<string, bigint>
	/** Prepayment plus Settlements net of refunds on this date. */
	readonly levy: bigint
	/** What each Flow, Levy and Account landed on this date; present only when the run tracks the breakdown. */
	readonly lines?: DayLines
}

export interface EngineRunsOut {
	readonly date: DateString
	readonly unmet: bigint
}

export interface DateOutcome {
	readonly totals: DayTotals
	readonly problem: ProjectionProblem | undefined
	readonly runsOut: EngineRunsOut | undefined
}
