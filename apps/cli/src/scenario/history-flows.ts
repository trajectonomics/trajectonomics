import type { Flow } from "@trajectonomics/core/sim"
import { baselineRatesOf } from "../baseline/rates"
import type { BaselineRates, RateRow } from "../baseline/rates-view"
import { type AppError, fail, isAppError } from "../errors"
import type { Ledger } from "../store"
import { parseMinorUnits } from "../store"

/** One Flow the template carries, in the key order the document prints. */
export type HistoryFlow = Flow

/** The Account's name as a label or category, when it is already written as one. */
function labelOf(name: string, max: number): string | undefined {
	return name === name.trim() && name.length >= 1 && name.length <= max ? name : undefined
}

/** The minor-unit amount one rates row states, through the CLI's own decimal parser. */
function amountOf(row: RateRow): number | AppError {
	const amount = parseMinorUnits(row.amount, "THB")
	return typeof amount === "number" ? amount : fail("internal")
}

function flowOf(row: RateRow, amount: number): HistoryFlow {
	const displayLabel = labelOf(row.account.name, 80)
	const frequency = row.frequency === "yearly" ? "annual" : "monthly"
	const label = displayLabel === undefined ? {} : { displayLabel }
	if (row.type === "income") {
		return {
			id: row.account.id,
			...label,
			kind: "income",
			earned: true,
			amount,
			frequency,
			start: row.start,
			growth: "inflation",
		}
	}
	const category = labelOf(row.account.name, 64)
	return {
		id: row.account.id,
		...label,
		kind: "expense",
		...(category === undefined ? {} : { category }),
		amount,
		frequency,
		start: row.start,
		growth: "inflation",
	}
}

/**
 * One Stream per row the rates carry, in row order, with the Account id as the Flow's id: unique,
 * stable, and enough to join a row to its Flow. Income is earned and every Stream grows with
 * inflation, so a template applies unchanged.
 */
export function historyFlowsOf(rates: BaselineRates): readonly HistoryFlow[] | AppError {
	const flows: HistoryFlow[] = []
	for (const row of rates.rows) {
		if (!row.inTemplate) continue
		const amount = amountOf(row)
		if (typeof amount !== "number") return amount
		flows.push(flowOf(row, amount))
	}
	return flows
}

/**
 * The Streams a template at `asOf` carries from history: one per row the rates keep. A window with
 * nothing to carry in is refused at `fromHistory`, naming both commands that show why (ADR-0044).
 */
export function templateFlowsOf(
	ledger: Ledger,
	asOf: string,
	history: { months: number },
): readonly HistoryFlow[] | AppError {
	const rates = baselineRatesOf(ledger, asOf, history.months)
	if (isAppError(rates)) return rates
	const flows = historyFlowsOf(rates)
	if (isAppError(flows)) return flows
	if (flows.length > 0) return flows
	return fail("invalid_input", {
		path: "fromHistory",
		message: `fromHistory: the Ledger states no income or expense to carry in from ${rates.window.from} to ${rates.window.to}`,
		hint: `Run "traj baseline rates --as-of ${asOf}" to see what it states, or "traj scenario apply --template --as-of ${asOf}" for the two zero Streams.`,
	})
}
