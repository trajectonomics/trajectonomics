import type { DateString } from "../types"
import type { ProjectionProblem } from "../types/projection"
import type { DateOutcome } from "./day-totals"
import { totalsOf } from "./levy-step"

const nothing = { income: 0n, expense: 0n, prepaid: 0n, withdrawals: 0n, employer: 0n }

/** A Derived-amount problem is reported before any Settlement, debt or tally work on the date. */
export function plannedFail(date: DateString, problem: ProjectionProblem): DateOutcome {
	return {
		totals: totalsOf(date, nothing, 0n, new Map(), new Map(), { amount: 0n, problem: undefined }),
		problem,
		runsOut: undefined,
	}
}
