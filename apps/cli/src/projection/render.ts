import type { ColumnHint, RenderHint } from "../table"
import { balanceBlocks, balancesHidden } from "./balances-human"
import { cashflowHidden } from "./cashflow-hidden"
import { cashflowBlocks } from "./cashflow-human"
import { reportingBlocks } from "./cashflow-span-human"
import { estateBlocks, estateHidden } from "./estate-human"
import { liabilitiesHidden, liabilityBlocks } from "./liabilities-human"
import { lifetimeBlocks } from "./lifetime-human"
import { milestoneColumns, runMilestonesShown } from "./milestones"
import { routingBlocks } from "./routing-human"
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

/** `projection run`'s ages column: each person's age as `me 37, partner 35`. */
export const agesColumn: ColumnHint = { key: "ages", label: "ages", show: agesText }

/**
 * `projection run`'s human view: the annual roll-up, the monthly rows when asked, the tax years the
 * Scenario's Levies settle, the notes under them, with `--breakdown` a cash-flow block per
 * roll-up (cli ADR-0058) and with `--breakdown-years` or `--breakdown-months` the Reporting years
 * and months (cli ADR-0086). Only the human Format reads it; `--json` keeps the output schema as the
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
			// Money moved between the plan's own Accounts; shown only when the Scenario declares a transfer Flow (cli ADR-0070).
			{ ...column("transfers", "right"), optional: true },
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
		fees: [
			column("index", "right"),
			column("from"),
			column("to"),
			column("account"),
			column("amount", "right"),
		],
	},
	// The long cash-flow, liability, balance, spending and estate tables are JSON's; the human form prints them as blocks after the body.
	display: (data) =>
		estateHidden(
			spendingHidden(balancesHidden(liabilitiesHidden(cashflowHidden(runMilestonesShown(data))))),
		),
	blocks: (data) => [
		...routingBlocks(data),
		...cashflowBlocks(data),
		...reportingBlocks(data),
		...liabilityBlocks(data),
		...balanceBlocks(data),
		...spendingBlocks(data),
		...estateBlocks(data),
		...lifetimeBlocks(data),
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
