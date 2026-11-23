import { z } from "zod"
import { dateString } from "./date"
import { integer } from "./integer"
import { money } from "./money"
import { personAges } from "./person-age"
import { cashflowTotalRow } from "./projection-totals"

/** One annual row: the roll-up of a year, with its real net worth measured at a monthly row. */
const annualRow = z.strictObject({
	index: integer,
	from: dateString,
	to: dateString,
	ages: personAges,
	openingNetWorth: money,
	closingNetWorth: money,
	income: money,
	// Present only when the Scenario declares a withdrawal Flow (cli ADR-0059).
	withdrawals: money.optional(),
	expense: money,
	contributions: money,
	unfundedContributions: money,
	interest: money,
	unmet: money,
	partial: z.boolean(),
	realNetWorth: z.strictObject({ date: dateString, amount: money }),
})

/** One monthly row: net worth on the row's date, nominal and real, and the accessible share. */
const monthlyRow = z.strictObject({
	date: dateString,
	ages: personAges,
	netWorth: money,
	realNetWorth: money,
	accessibleNetWorth: money,
	realAccessibleNetWorth: money,
})

/**
 * One line of an Annual roll-up's cash flow (cli ADR-0058): its source `group`, the names it carries
 * and its amount, a decimal string at the Currency's scale. A settlement keeps its sign.
 */
export const cashflowRow = z.strictObject({
	index: integer,
	from: dateString,
	to: dateString,
	group: z.enum([
		"income",
		"prepaid",
		"settlement",
		"expense",
		"category",
		"contribution",
		"unfunded",
		"withdrawal",
		"drawn",
		"surplus",
		"unmet",
	]),
	id: z.string().nullable(),
	account: z.string().nullable(),
	category: z.string().nullable(),
	amount: money,
})

/** One liability's month: the amount owed at each end, what was borrowed and paid, and the interest (cli ADR-0059). */
export const liabilityRow = z.strictObject({
	account: z.string(),
	from: dateString,
	to: dateString,
	opening: money,
	drawn: money,
	paid: money,
	interest: money,
	closing: money,
	partial: z.boolean(),
})

/** One liability's paid-off date, or null when it is not paid off by the end (cli ADR-0059). */
export const paidOffRow = z.strictObject({
	account: z.string(),
	date: dateString.nullable(),
})

/**
 * One Milestone's fire date: the date it fired, or null when it did not fire by the Projection's end
 * (cli ADR-0049). Rows come in Scenario order.
 */
export const milestoneRow = z.strictObject({
	id: z.string(),
	reached: z.boolean(),
	date: dateString.nullable(),
})

/**
 * The projection's tables: the annual roll-up always, the monthly rows only with `--monthly`, the cash
 * flow and its section totals only with `--breakdown`, the loans only with `--liabilities`, and the milestones only when the
 * Scenario declares them.
 */
export const projectionTables = z.array(
	z.discriminatedUnion("name", [
		z.strictObject({ name: z.literal("annual"), count: integer, rows: z.array(annualRow) }),
		z.strictObject({ name: z.literal("monthly"), count: integer, rows: z.array(monthlyRow) }),
		z.strictObject({ name: z.literal("cashflow"), count: integer, rows: z.array(cashflowRow) }),
		z.strictObject({
			name: z.literal("cashflowTotals"),
			count: integer,
			rows: z.array(cashflowTotalRow),
		}),
		z.strictObject({ name: z.literal("liabilities"), count: integer, rows: z.array(liabilityRow) }),
		z.strictObject({ name: z.literal("paidOff"), count: integer, rows: z.array(paidOffRow) }),
		z.strictObject({
			name: z.literal("milestones"),
			count: integer,
			rows: z.array(milestoneRow),
		}),
	]),
)
export type ProjectionTables = z.infer<typeof projectionTables>
