/**
 * What `projection run` states for an Account over the plan, year by year: the money paid out of it as income (the `payout` lines of
 * the cash flow) and the fee charged to it (the `fees` table, cli ADR 0067). Every amount is the CLI's decimal string: the engine
 * states no lifetime total, so the page adds none, and a person reads each year's figure as stated (web ADR 0017).
 */
import type { ProjectionRun } from "../../contract"

/** One roll-up in which an Account was paid out or charged: its span and each amount the CLI states, null when it states none. */
export interface AccountYear {
	readonly index: number
	readonly from: string
	readonly to: string
	readonly payout: string | null
	readonly fee: string | null
}

interface Line {
	readonly index: number
	readonly from: string
	readonly to: string
	readonly field: "payout" | "fee"
	readonly amount: string
}

/** The lines `projection run` states for an Account: each fee row, and each `payout` line of the cash flow. */
function linesOf(run: ProjectionRun | undefined, account: string): Line[] {
	return (run?.tables ?? []).flatMap((table): Line[] => {
		if (table.name === "fees") {
			return table.rows
				.filter((row) => row.account === account)
				.map((row) => ({ ...row, field: "fee" as const }))
		}
		if (table.name !== "cashflow") return []
		return table.rows
			.filter((row) => row.group === "payout" && row.account === account)
			.map((row) => ({ ...row, field: "payout" as const }))
	})
}

/** The roll-ups of a run in which the Account was paid out of or charged a fee, in order. Empty when the run states none. */
export function accountYears(run: ProjectionRun | undefined, account: string): AccountYear[] {
	const years = new Map<number, AccountYear>()
	for (const line of linesOf(run, account)) {
		const year = years.get(line.index) ?? {
			index: line.index,
			from: line.from,
			to: line.to,
			payout: null,
			fee: null,
		}
		years.set(line.index, { ...year, [line.field]: line.amount })
	}
	return [...years.values()].sort((a, b) => a.index - b.index)
}
