import { z } from "zod"
import { dateField, moneyField } from "./money"

/*
 * The shape of `tables.annual` in a compare (cli ADR-0049, amended): each side's figures for one
 * Annual roll-up, and the change between them where the periods agree. `compare-annual.ts` computes
 * the rows; this file states what they are.
 */

/** One side's period of a roll-up: its first and last day, as the engine states them. */
export type PeriodView = { from: string; to: string }

/** One figure of a roll-up on both sides: a per side, and the change b minus a, or null. */
export type CompareFigure = { a: string | null; b: string | null; delta: string | null }

/** One Annual roll-up's row: the figures each side has, and the change where the periods agree. */
export type CompareAnnualRow = {
	index: number
	/** The period both sides share; null when they differ or one side has no such year. */
	from: string | null
	to: string | null
	/** Each side's own period, null for a side that has no such year. */
	periods: { a: PeriodView | null; b: PeriodView | null }
	closingNetWorth: CompareFigure
	income: CompareFigure
	expense: CompareFigure
	contributions: CompareFigure
	interest: CompareFigure
	/** Present only when either side's Scenario holds a Levy; a side without one has null here. */
	levy?: CompareFigure | undefined
}

/** The tables a compare reports. Only `annual` exists today. */
export type CompareTable = { name: "annual"; count: number; rows: CompareAnnualRow[] }

const periodView = z.strictObject({
	from: dateField("The first day of the period"),
	to: dateField("The last day of the period"),
})

const figure = (what: string) =>
	z.strictObject({
		a: moneyField(`${what} in side A, or null when A has no such year`).nullable(),
		b: moneyField(`${what} in side B, or null when B has no such year`).nullable(),
		delta: moneyField(
			`${what}: B minus A, or null when the periods differ or a side is missing`,
		).nullable(),
	})

export const compareAnnualRow: z.ZodType<CompareAnnualRow> = z.strictObject({
	index: z.number().int().describe("The roll-up's index, the year counted from the As-of, from 0."),
	from: dateField(
		"The first day of the period both sides share, or null when they do not",
	).nullable(),
	to: dateField("The last day of the period both sides share, or null when they do not").nullable(),
	periods: z.strictObject({
		a: periodView.nullable().describe("Side A's own period of this year, or null."),
		b: periodView.nullable().describe("Side B's own period of this year, or null."),
	}),
	closingNetWorth: figure("Net worth at the period's end"),
	income: figure("The period's income"),
	expense: figure("The period's expense"),
	contributions: figure("The period's contributions"),
	interest: figure("The period's interest"),
	levy: figure("The period's Levy, present only when a side's Scenario holds a Levy").optional(),
})

export const compareTables: z.ZodType<CompareTable[]> = z
	.array(
		z.strictObject({
			name: z.literal("annual").describe("The annual roll-up of both sides, one row per year."),
			count: z.number().int().describe("The number of roll-up rows."),
			rows: z
				.array(compareAnnualRow)
				.describe(
					"One row per Annual roll-up index present on either side, in index order. A year with a change on both sides has its delta; a year that differs or is on one side only has delta null.",
				),
		}),
	)
	.describe(
		"The annual roll-up of both sides. Each row states each side's figures and the change between them.",
	)
