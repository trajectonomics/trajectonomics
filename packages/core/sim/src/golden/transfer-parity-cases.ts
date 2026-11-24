import type { ParityCase } from "./parity-cases"
import {
	transferLoan,
	transferLocked,
	transferRollover,
	transferShares,
	transferShort,
} from "./transfer-cases"

const withLines = { cashflowBreakdown: true, liabilityStatements: true } as const

/** Transfers between the plan's own Accounts: the roll-ups, the breakdown, the statements and FI (ADR 0031). */
export const TRANSFER_PARITY_CASES: readonly ParityCase[] = [
	{ name: "transfer-rollover-month", fixture: transferRollover, projectOptions: withLines },
	{ name: "transfer-shares-month", fixture: transferShares, projectOptions: withLines },
	{ name: "transfer-loan-month", fixture: transferLoan, projectOptions: withLines },
	{ name: "transfer-short-month", fixture: transferShort, projectOptions: withLines },
	{
		name: "transfer-locked-fi",
		fixture: transferLocked,
		options: { method: "survival", minBufferMonths: 6 },
	},
]
