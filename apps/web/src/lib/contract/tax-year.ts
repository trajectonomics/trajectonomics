import { z } from "zod"
import { dateString } from "./date"
import { integer } from "./integer"
import { money } from "./money"

/** A tax figure a period used whose source is not yet confirmed (cli ADR 0042). */
export const assumption = z.strictObject({
	path: z.string(),
	value: z.union([z.number(), z.array(z.number())]),
	status: z.enum(["reported", "unsourced"]),
	note: z.string(),
})
export type Assumption = z.infer<typeof assumption>

/** The walk from a tax year's assessable income to its taxable income, from the Levy's own Measures (cli ADR 0036). */
export const taxWalk = z.strictObject({
	assessable: money,
	expenses: money,
	allowances: money,
	taxableIncome: money,
})
export type TaxWalk = z.infer<typeof taxWalk>

/** One progressive bracket: its edges, its rate in basis points, and the income and tax inside it (cli ADR 0036). */
export const taxBracket = z.strictObject({
	from: money,
	upTo: money.nullable(),
	rateBps: integer,
	income: money,
	tax: money,
})
export type TaxBracket = z.infer<typeof taxBracket>

/** One Levy settlement period: what it owes, what was prepaid, and whether its settlement is in view. */
export const taxYear = z.strictObject({
	levy: z.string(),
	/**
	 * The Filer whose Return this Levy files, for a separate filing (cli ADR-0075); absent when the plan keeps one
	 * Return, so a Snapshot saved by an earlier build still decodes.
	 */
	filer: z.string().optional(),
	from: dateString,
	to: dateString,
	settlementDate: dateString,
	due: money,
	prepaid: money,
	owed: money,
	settled: z.boolean(),
	partial: z.boolean(),
	/** The figures a reader checks by hand and a note when the minimum tax applied (cli ADR 0052). */
	taxableIncome: money.optional(),
	progressiveTax: money.optional(),
	/**
	 * The walk, the brackets and the rates of a Thai Levy the CLI emitted; each is absent for a Levy it did not
	 * emit, and `toNextBracket` in the top bracket, `effectiveRateBps` when nothing was assessed (cli ADR 0036).
	 */
	walk: taxWalk.optional(),
	brackets: z.array(taxBracket).optional(),
	marginalRateBps: integer.optional(),
	toNextBracket: money.optional(),
	effectiveRateBps: integer.optional(),
	notes: z.array(z.string()).optional(),
	assumptions: z.array(assumption),
})
export type TaxYear = z.infer<typeof taxYear>
