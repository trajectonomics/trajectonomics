import type { ScenarioAccount, ScenarioDocument } from "../../contract"
import { formatBps } from "../../format/bps"

/**
 * One row of the page, an asset Account, as text a form binds. An illiquid asset (a home, a car) has no volatility field
 * (`swings` is false) and shows its return only. A liability has no row: it keeps its loan form.
 */
export interface AccountText {
	readonly id: string
	readonly swings: boolean
	rate: string
	/** Empty is the Account with no volatility: fixed at its return in every path. */
	volatility: string
}

/** The page's text: inflation, and each asset Account's return and volatility, in the document's order. */
export interface AssumptionsDraft {
	inflation: string
	accounts: AccountText[]
}

/** One asset Account's row, as stored. */
function rowOf(account: ScenarioAccount): AccountText {
	return {
		id: account.id,
		swings: account.liquid !== false,
		rate: formatBps(account.rate),
		volatility: account.volatility === undefined ? "" : formatBps(account.volatility),
	}
}

/** The draft of a stored plan. Nothing is made up: an inflation or a volatility the plan does not state is empty. */
export function draftOf(doc: ScenarioDocument): AssumptionsDraft {
	return {
		inflation: doc.economy === undefined ? "" : formatBps(doc.economy.inflation),
		accounts: doc.accounts.filter((account) => account.kind === "asset").map(rowOf),
	}
}

/** The key a field's problem is held under: `inflation`, or `rate:<id>` and `volatility:<id>`. */
export function fieldKey(field: "rate" | "volatility", id: string): string {
	return `${field}:${id}`
}
