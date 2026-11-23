import type { Fixture } from "../fixtures/fixture"
import { levelLoanMonth } from "./loan-cases"
import type { ParityCase } from "./parity-cases"
import { borrowedLoan, extraPaymentLoan, midMonthLoan } from "./statement-cases"
import { longLoan, runOutLoan, zeroRateLoan } from "./statement-edge-cases"

const withStatements = { liabilityStatements: true } as const

function statementCase(name: string, fixture: Fixture): ParityCase {
	return { name, fixture, projectOptions: withStatements }
}

/** Projections with `liabilityStatements`; the cases without it stay in `PARITY_CASES`. */
export const STATEMENT_PARITY_CASES: readonly ParityCase[] = [
	statementCase("loan-statement-month", levelLoanMonth),
	statementCase("loan-statement-extra", extraPaymentLoan),
	statementCase("loan-statement-mid-month", midMonthLoan),
	statementCase("loan-statement-borrow", borrowedLoan),
	statementCase("loan-statement-zero-rate", zeroRateLoan),
	statementCase("loan-statement-open", longLoan),
	statementCase("loan-statement-run-out", runOutLoan),
]
