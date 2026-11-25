import type { ProjectionRun, Read } from "../../contract"
import { formatDate } from "../../format/date"
import { agesText } from "../household/model"
import { NO_PEOPLE, type PersonNames } from "../item-names"
import { EMPLOYER_NOTE, EMPLOYER_SECTION, SECTIONS } from "./cashflow-sections"

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

/**
 * One part of a section: its sub-heading, if the CLI's lines of the section come in two sets, and the
 * lines of that part. A section's parts are each a full view of its total, so they are never added up.
 */
export interface SectionPart {
	readonly heading: string | null
	readonly lines: readonly CashflowLine[]
}

/** One section of the table: its total's name, the CLI's amount for it, and its parts in the order drawn. */
export interface Section {
	readonly total: CashflowTotal["total"] | typeof EMPLOYER_SECTION
	readonly amount: string | null
	/** Why the section has no total, when it is not part of the cash: the employer's money goes straight into an account. */
	readonly note: string | null
	readonly parts: readonly SectionPart[]
}

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

/** A band the person picked, with the index of the roll-up it was picked in. */
export interface Pick {
	readonly index: number
	readonly key: string
}

/** The key of the band picked in the roll-up shown, or null when the pick was made in another year. */
export function pickedKey(pick: Pick | null, index: number | undefined): string | null {
	return pick !== null && pick.index === index ? pick.key : null
}

/** A year's label for the selector: its span, its household's ages, and a mark for a partial year. */
export function yearLabel(rollup: Rollup, people: PersonNames = NO_PEOPLE): string {
	const ages = agesText(rollup.ages, people)
	return [
		`${formatDate(rollup.from)} to ${formatDate(rollup.to)}`,
		ages === "" ? null : `ages ${ages}`,
		rollup.partial ? "partial year" : null,
	]
		.filter((part): part is string => part !== null)
		.join(", ")
}

/** The sections of a roll-up: each with the CLI's total for it, and its parts, whose lines keep the CLI's order. The employer's section shows only when it has lines. */
export function sectionsOf(rollup: Rollup): Section[] {
	return SECTIONS.map((section) => ({
		total: section.total,
		amount: rollup.totals.find((total) => total.total === section.total)?.amount ?? null,
		note: section.total === EMPLOYER_SECTION ? EMPLOYER_NOTE : null,
		parts: section.parts.map((part) => ({
			heading: part.heading,
			lines: part.groups.flatMap((group) => rollup.lines.filter((line) => line.group === group)),
		})),
	})).filter(
		(section) =>
			section.total !== EMPLOYER_SECTION || section.parts.some((part) => part.lines.length > 0),
	)
}
