import type { AccountList, ProjectionRun, Read } from "../../contract"
import { formatDate } from "../../format/date"
import { agesText } from "../household/model"

/**
 * The Cash flow page's view model. Pure: it groups the lines and section totals the CLI gives
 * (`projection run --breakdown`, cli ADR-0058 and its addendum), and never adds, subtracts or nets a
 * money figure. A total on the page is the CLI's `cashflowTotals` row, and a line is a `cashflow` row.
 */

type Table = ProjectionRun["tables"][number]

/** One line of an Annual roll-up's cash flow, as the CLI states it. */
export type CashflowLine = Extract<Table, { name: "cashflow" }>["rows"][number]

/** One section total of an Annual roll-up, as the CLI states it. */
export type CashflowTotal = Extract<Table, { name: "cashflowTotals" }>["rows"][number]

/** One Annual roll-up: its span, its ages and partial mark, with its own lines and section totals. */
export interface Rollup {
	readonly index: number
	readonly from: string
	readonly to: string
	readonly partial: boolean
	readonly ages: readonly { readonly person: string; readonly age: number }[]
	readonly lines: readonly CashflowLine[]
	readonly totals: readonly CashflowTotal[]
}

/** One section of the table: its total's name, the CLI's amount for it, and the lines it groups. */
export interface Section {
	readonly total: CashflowTotal["total"]
	readonly amount: string | null
	readonly lines: readonly CashflowLine[]
}

/**
 * The sections in the order a person reads them. Each names the total the CLI gives it and the line
 * groups that make up its rows. `money in` is income; withdrawals and drawn have their own sections,
 * which the engine's `money in` includes.
 */
const SECTIONS: readonly {
	total: CashflowTotal["total"]
	groups: readonly CashflowLine["group"][]
}[] = [
	{ total: "money in", groups: ["income"] },
	{ total: "tax", groups: ["prepaid", "settlement"] },
	{ total: "withdrawals", groups: ["withdrawal"] },
	{ total: "drawn", groups: ["drawn"] },
	{ total: "spending", groups: ["category", "expense"] },
	{ total: "saving", groups: ["contribution"] },
	{ total: "not funded", groups: ["unfunded"] },
	{ total: "left over", groups: ["surplus"] },
	{ total: "unmet", groups: ["unmet"] },
]

/** Whether a Read carries the cash flow table, which only a run with `--breakdown` has. The navigation lists the page only then. */
export function hasCashflow(read: Read<ProjectionRun> | undefined): boolean {
	return read?.ok === true && read.data.tables.some((table) => table.name === "cashflow")
}

/** The Annual roll-ups of a run, in order, each with its lines and totals. Empty without an annual table. */
export function rollupsOf(run: ProjectionRun): Rollup[] {
	const annual = run.tables.find((table) => table.name === "annual")
	if (annual?.name !== "annual") return []
	const lines = run.tables.flatMap((table) => (table.name === "cashflow" ? table.rows : []))
	const totals = run.tables.flatMap((table) => (table.name === "cashflowTotals" ? table.rows : []))
	return annual.rows.map((row) => ({
		index: row.index,
		from: row.from,
		to: row.to,
		partial: row.partial,
		ages: row.ages,
		lines: lines.filter((line) => line.index === row.index),
		totals: totals.filter((total) => total.index === row.index),
	}))
}

/** The roll-up the address bar asks for, by its index, or the first one when the request is none of them. */
export function chooseRollup(rollups: readonly Rollup[], requested: string): Rollup | null {
	return rollups.find((rollup) => String(rollup.index) === requested) ?? rollups[0] ?? null
}

/** A year's label for the selector: its span, its household's ages, and a mark for a partial year. */
export function yearLabel(rollup: Rollup): string {
	const ages = agesText(rollup.ages)
	return [
		`${formatDate(rollup.from)} to ${formatDate(rollup.to)}`,
		ages === "" ? null : `ages ${ages}`,
		rollup.partial ? "partial year" : null,
	]
		.filter((part): part is string => part !== null)
		.join(", ")
}

/** The name of each Account, by its id, from the accounts Read. An id the Read does not name stays as it is. */
export function accountNamesOf(read: Read<AccountList> | undefined): ReadonlyMap<string, string> {
	if (read?.ok !== true) return new Map()
	return new Map(read.data.accounts.map((account) => [account.id, account.name]))
}

/** The sections of a roll-up: each with the CLI's total for it, and the lines it groups, in the CLI's order within a group. */
export function sectionsOf(rollup: Rollup): Section[] {
	return SECTIONS.map((section) => ({
		total: section.total,
		amount: rollup.totals.find((total) => total.total === section.total)?.amount ?? null,
		lines: section.groups.flatMap((group) => rollup.lines.filter((line) => line.group === group)),
	}))
}
