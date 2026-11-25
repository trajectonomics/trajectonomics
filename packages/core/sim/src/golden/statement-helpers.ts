import { addDays } from "../calendar/arith"
import { project } from "../engine/project"
import type { Fixture } from "../fixtures/fixture"
import type { LiabilityStatement } from "../types"
import { type OracleStatement, walkStatement } from "./oracle-statement"
import { calendarDays } from "./statement-days"

export type Lands = Parameters<typeof calendarDays>[2]

/** The amount that lands on a date. */
export type Landing = (date: string) => bigint

/** A statement reduced to what the engine and the oracle must agree on. */
export interface Table {
	readonly dates: readonly string[]
	readonly figures: readonly (readonly bigint[])[]
	readonly paidOff: string | undefined
}

export const OPTION: { readonly liabilityStatements: boolean } = { liabilityStatements: true }

/** The level payment of the 10,000,000 loan under ceil, as the README prints it. */
export const LEVEL_PAYMENT = 860_665n

export const MONTH_ENDS: readonly string[] = [
	"2026-01-31",
	"2026-02-28",
	"2026-03-31",
	"2026-04-30",
	"2026-05-31",
	"2026-06-30",
	"2026-07-31",
	"2026-08-31",
	"2026-09-30",
	"2026-10-31",
	"2026-11-30",
	"2026-12-31",
]

export const onDays =
	(dates: readonly string[], amount: bigint): Landing =>
	(date: string) =>
		dates.includes(date) ? amount : 0n

export const plus =
	(a: Landing, b: Landing): Landing =>
	(date: string) =>
		a(date) + b(date)

export function statementOf(fixture: Fixture): LiabilityStatement {
	const result = project(fixture.baseline, fixture.scenario, fixture.timeline, OPTION)
	if (!result.ok) throw new Error(JSON.stringify(result.problems))
	return result.projection.liabilities![0]!
}

/** The oracle walks from the day after the Timeline start, since the start day is its own month. A nominal loan only. */
export function oracleOf(fixture: Fixture, lands: Lands, end: string): OracleStatement {
	const loan = fixture.scenario.accounts.find((item) => item.id === "loan")!
	const opening = fixture.baseline.balances.find((item) => item.account === "loan")!.amount
	const days = calendarDays(
		addDays(fixture.timeline.start, 1),
		end,
		lands,
		loan.compounding ?? "monthly",
	)
	return walkStatement(BigInt(opening), BigInt(loan.rate), days)
}

/** The engine's months after the start month: their end dates, figures and payoff date. */
export function engineTable(statement: LiabilityStatement): Table {
	const months = statement.months.slice(1)
	return {
		dates: months.map((item) => item.to),
		figures: months.map((item) =>
			[item.opening, item.drawn, item.paid, item.interest, item.closing].map((value) =>
				BigInt(value),
			),
		),
		paidOff: statement.paidOff,
	}
}

export function oracleTable(oracle: OracleStatement): Table {
	return {
		dates: oracle.months.map((item) => item.date),
		figures: oracle.months.map((item) => [
			item.opening,
			item.drawn,
			item.paid,
			item.interest,
			item.closing,
		]),
		paidOff: oracle.paidOff,
	}
}

/** Whether every month adds up exactly and opens where the one before closed. */
export function identityHolds(statement: LiabilityStatement): boolean {
	let previous: bigint | undefined
	for (const { opening, drawn, interest, paid, closing } of statement.months) {
		const open = BigInt(opening)
		if (open + BigInt(drawn) + BigInt(interest) - BigInt(paid) !== BigInt(closing)) return false
		if (previous !== undefined && open !== previous) return false
		previous = BigInt(closing)
	}
	return true
}
