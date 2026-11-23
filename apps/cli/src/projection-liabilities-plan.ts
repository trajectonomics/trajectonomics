import type { Scenario } from "@trajectonomics/core/sim"
import { PROJECTION_SCENARIO } from "./projection/testing"

/*
 * The plans `projection run --liabilities` is pinned on (cli ADR-0059). Each adds one car loan to the
 * projection fixture: a planned withdrawal borrows it after the As-of, and a level payment a month
 * repays it. The Baseline holds no car balance, so the loan starts at zero.
 */

/** The car loan's account id, the one name every liability test and example reads. */
export const CAR_LOAN = "car"

type Flows = Scenario["flows"]

/** The withdrawal that borrows the principal in June 2026, and the level payment that repays it. */
function loanFlows(principal: number, payments: number): Flows {
	return [
		{
			id: "car-loan",
			kind: "withdrawal",
			source: CAR_LOAN,
			frequency: "once",
			start: "2026-06-01",
			amount: principal,
			growth: { bps: 0 },
		},
		{
			id: "car-pay",
			kind: "contribution",
			target: CAR_LOAN,
			frequency: "monthly",
			start: "2026-07-01",
			level: { principal, payments, rounding: "ceil" },
		},
	]
}

/**
 * A 12,000.00 THB car loan at 6% nominal, compounded monthly, repaid by six level payments, with one
 * 2,000.00 THB extra payment in September. The tests check its statement against the identity the
 * statement must hold and against the Projection's own rows, not against a worked number.
 */
export const LOAN_SCENARIO: Scenario = {
	...PROJECTION_SCENARIO,
	accounts: [
		...PROJECTION_SCENARIO.accounts,
		{ id: CAR_LOAN, kind: "liability", rate: 600, compounding: "monthly" },
	],
	flows: [
		...PROJECTION_SCENARIO.flows,
		...loanFlows(1_200_000, 6),
		{
			id: "car-extra",
			kind: "contribution",
			target: CAR_LOAN,
			frequency: "once",
			start: "2026-09-15",
			amount: 200_000,
			growth: { bps: 0 },
		},
	],
}

/**
 * The same loan at 0%, six payments of exactly 1,000.00 THB on a 6,000.00 THB withdrawal. With no
 * interest every figure is a plain sum, so a test checks each month by hand.
 */
export const ZERO_LOAN_SCENARIO: Scenario = {
	...PROJECTION_SCENARIO,
	accounts: [
		...PROJECTION_SCENARIO.accounts,
		{ id: CAR_LOAN, kind: "liability", rate: 0, compounding: "monthly" },
	],
	flows: [...PROJECTION_SCENARIO.flows, ...loanFlows(600_000, 6)],
}
