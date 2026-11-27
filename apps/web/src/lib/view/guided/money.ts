/**
 * The money step's view of `traj baseline rates`: one row per Account the read would carry in, the rows it
 * leaves out and why, and the two totals the CLI states ([web ADR 0031](../../../docs/adr/0031-a-guided-first-plan-is-one-edit-that-saves-a-plan-and-its-household.md)).
 * Pure: the read in, words out, and no sum anywhere (web ADR 0002).
 */
import type { BaselineRates } from "../../contract"

/** What one carried Account states on the page. */
export interface GuidedMoneyRow {
	readonly id: string
	readonly name: string
	readonly type: "income" | "expense"
	readonly frequency: "monthly" | "yearly"
	/** The CLI's one occurrence, as it stated it. */
	readonly amount: string
	/** The window the rate was read over, in the person's words, such as "8 of 12 months". */
	readonly monthsText: string
}

/** An Account the read does not carry in, and the words for why. */
export interface LeftOutRow {
	readonly name: string
	readonly reason: string
}

/** The money step: the history rows, or the two-totals path when the ledger states too little. */
export interface MoneyView {
	readonly path: "history" | "totals"
	readonly rows: readonly GuidedMoneyRow[]
	readonly leftOut: readonly LeftOutRow[]
	readonly totals: { readonly income: string | null; readonly spending: string | null }
}

/** The shortest record a run-rate is stated over; a shorter one takes the totals path. */
export const FEWEST_MONTHS = 3

/** The words each reason the CLI states for a row it leaves out. */
const REASONS: Readonly<Record<string, string>> = {
	archived: "Closed account",
	negative: "Refunds exceed spending",
	zero: "Nets to zero",
}

/** The CLI's monthly total for one type, or null when the read states no whole month. */
function monthlyOf(rates: BaselineRates | undefined, type: "income" | "expense"): string | null {
	return rates?.totals.find((total) => total.type === type)?.monthly ?? null
}

/** One carried row, with the window the read covered. */
function carriedOf(rates: BaselineRates): GuidedMoneyRow[] {
	return rates.rows
		.filter((row) => row.inTemplate)
		.map((row) => ({
			id: row.account.id,
			name: row.account.name,
			type: row.type,
			frequency: row.frequency,
			amount: row.amount,
			monthsText: `${rates.monthsCovered} of ${rates.months} months`,
		}))
}

/** Every row the read leaves out, with the CLI's reason in words. */
function leftOutOf(rates: BaselineRates | undefined): LeftOutRow[] {
	return (rates?.rows ?? []).flatMap((row) => {
		const reason = row.leftOutBecause === undefined ? undefined : REASONS[row.leftOutBecause]
		return row.inTemplate || reason === undefined ? [] : [{ name: row.account.name, reason }]
	})
}

/**
 * The money step. The totals path is chosen when the read is absent (an empty ledger, or one the read
 * refused), when it covers fewer than three whole months, or when no row would be carried in.
 */
export function moneyOf(rates: BaselineRates | undefined): MoneyView {
	const totals = { income: monthlyOf(rates, "income"), spending: monthlyOf(rates, "expense") }
	const rows = rates === undefined ? [] : carriedOf(rates)
	const few = rates === undefined || rates.monthsCovered < FEWEST_MONTHS || rows.length === 0
	return {
		path: few ? "totals" : "history",
		rows,
		leftOut: leftOutOf(rates),
		totals,
	}
}
