import { z } from "zod"
import { dateString } from "./date"
import { integer } from "./integer"
import { money } from "./money"
import { personAges } from "./person-age"
import {
	balanceRow,
	estateLineRow,
	estateRow,
	liabilityRow,
	milestoneRow,
	paidOffRow,
	spendingRuleRow,
} from "./projection-rows"
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

/**
 * The projection's tables: the annual roll-up always, the monthly rows only with `--monthly`, the cash
 * flow and its section totals only with `--breakdown`, the loans only with `--liabilities`, each Account's
 * value only with `--accounts`, each spending rule's years only with `--spending`, the estate and its lines only with `--estate`, and the milestones
 * only when the Scenario declares them.
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
		z.strictObject({ name: z.literal("balances"), count: integer, rows: z.array(balanceRow) }),
		z.strictObject({
			name: z.literal("spendingRules"),
			count: integer,
			rows: z.array(spendingRuleRow),
		}),
		z.strictObject({ name: z.literal("estate"), count: integer, rows: z.array(estateRow) }),
		z.strictObject({
			name: z.literal("estateLines"),
			count: integer,
			rows: z.array(estateLineRow),
		}),
		z.strictObject({
			name: z.literal("milestones"),
			count: integer,
			rows: z.array(milestoneRow),
		}),
	]),
)
export type ProjectionTables = z.infer<typeof projectionTables>
