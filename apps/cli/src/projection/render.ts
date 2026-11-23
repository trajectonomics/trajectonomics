import type { ColumnHint, RenderHint } from "../table"
import { balanceBlocks, balancesHidden } from "./balances-human"
import { cashflowBlocks, cashflowHidden } from "./cashflow-human"
import { compareAnnualBlocks, compareTablesHidden } from "./compare-annual-human"
import { liabilitiesHidden, liabilityBlocks } from "./liabilities-human"
import {
	compareMilestoneBlocks,
	compareMilestonesHidden,
	milestoneColumns,
	runMilestonesShown,
} from "./milestones"
import { spendingBlocks, spendingHidden } from "./spending-human"

/** One column of a table-shaped result, headed exactly as its row key is spelled. */
const column = (key: string, align?: ColumnHint["align"]): ColumnHint =>
	align === undefined ? { key, label: key } : { key, label: key, align }

/** `me 37, partner 35`: each person's age, in household order; empty without a household. */
function agesText(value: unknown): unknown {
	if (!Array.isArray(value)) return value
	return value
		.map((entry: unknown) => {
			if (typeof entry !== "object" || entry === null) return ""
			const { person, age } = entry as { person?: unknown; age?: unknown }
			return `${String(person)} ${String(age)}`
		})
		.join(", ")
}

const agesColumn: ColumnHint = { key: "ages", label: "Ages", show: agesText }

/**
 * `projection run`'s human view: the annual roll-up, the monthly rows when asked, the tax years the
 * Scenario's Levies settle, the notes under them, and with `--breakdown` a cash-flow block per
 * roll-up (cli ADR-0058). Only the human Format reads it; `--json` keeps the output schema as the
 * contract.
 *
 * Every field of a row is a column, headed by its own key, so the table neither drops nor renames
 * a value (ADR-0027). The nested `realNetWorth` reads as its compact JSON.
 */
export const projectionHint: RenderHint = {
	tables: "tables",
	rows: "rows",
	columns: {
		annual: [
			column("index", "right"),
			column("from"),
			column("to"),
			agesColumn,
			column("openingNetWorth", "right"),
			column("closingNetWorth", "right"),
			column("income", "right"),
			// Shown only when a row states it, so a Scenario without a withdrawal Flow prints as before.
			{ ...column("withdrawals", "right"), optional: true },
			column("expense", "right"),
			column("contributions", "right"),
			column("unfundedContributions", "right"),
			column("interest", "right"),
			column("unmet", "right"),
			column("partial"),
			column("realNetWorth"),
		],
		monthly: [
			column("date"),
			agesColumn,
			column("netWorth", "right"),
			column("realNetWorth", "right"),
			column("accessibleNetWorth", "right"),
			column("realAccessibleNetWorth", "right"),
		],
		milestones: milestoneColumns,
	},
	// The long cash-flow, liability, balance and spending tables are JSON's; the human form prints them as blocks after the body.
	display: (data) =>
		spendingHidden(balancesHidden(liabilitiesHidden(cashflowHidden(runMilestonesShown(data))))),
	blocks: (data) => [
		...cashflowBlocks(data),
		...liabilityBlocks(data),
		...balanceBlocks(data),
		...spendingBlocks(data),
	],
	note: "notes",
	extra: [
		{
			field: "taxYears",
			name: "taxYears",
			columns: [
				column("levy"),
				column("from"),
				column("to"),
				column("settlementDate"),
				column("due", "right"),
				column("prepaid", "right"),
				column("owed", "right"),
				column("settled"),
				column("partial"),
			],
		},
	],
}

/**
 * `projection compare`'s human view: the same figures as before, and each side's milestones as a
 * table of its own after them (cli ADR-0049). The milestones leave the listing, so they are not
 * printed twice.
 */
export const compareHint: RenderHint = {
	display: (data) => compareTablesHidden(compareMilestonesHidden(data)),
	blocks: (data) => [...compareAnnualBlocks(data), ...compareMilestoneBlocks(data)],
}
