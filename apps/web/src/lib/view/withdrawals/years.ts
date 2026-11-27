import type { ProjectionRun, ProjectionTables } from "../../contract"
import { formatDate } from "../../format"
import { ACTION_WORDS } from "./words"

type SpendingTable = Extract<ProjectionTables[number], { name: "spendingRules" }>

/** One Rule year of one rule Flow, every figure the CLI's text. `share` is the withdrawal rate as the CLI states it. */
export interface RuleYearRow {
	readonly key: string
	/** The Rule year's first date, as the CLI states it, before it is written out. */
	readonly date: string
	/** The Rule year's first date, written out. */
	readonly from: string
	readonly portfolio: string
	readonly amount: string
	readonly paid: string
	readonly realAmount: string
	readonly realPaid: string
	/** "4.12%", or null when the portfolio was worth nothing and the CLI states no rate. */
	readonly share: string | null
	readonly action: string
	/** The rule moved the amount (a limit, a cut or a raise): the row carries a marker beside its words. */
	readonly marked: boolean
}

/** The Rule years of one rule Flow. */
export interface RuleYears {
	readonly flow: string
	readonly rows: readonly RuleYearRow[]
}

/** The `spendingRules` rows of a run: empty when the run was made without `--spending` or the plan has no rule. */
function tableOf(run: ProjectionRun): SpendingTable["rows"] {
	const table = run.tables.find((one): one is SpendingTable => one.name === "spendingRules")
	return table?.rows ?? []
}

/** The Rule years of every rule Flow a run states, one group per Flow in the order the CLI gives them. */
export function ruleYearsOf(run: ProjectionRun): RuleYears[] {
	const groups = new Map<string, RuleYearRow[]>()
	for (const row of tableOf(run)) {
		const rows = groups.get(row.flow) ?? []
		rows.push({
			key: `${row.flow}-${row.date}`,
			date: row.date,
			from: formatDate(row.date),
			portfolio: row.portfolio,
			amount: row.amount,
			paid: row.paid,
			realAmount: row.realAmount,
			realPaid: row.realPaid,
			share: row.withdrawalRate === undefined ? null : `${row.withdrawalRate}%`,
			action: ACTION_WORDS[row.action] ?? row.action,
			marked: row.action !== "none",
		})
		groups.set(row.flow, rows)
	}
	return [...groups].map(([flow, rows]) => ({ flow, rows }))
}
