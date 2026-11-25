import { z } from "zod"
import type { FlagDocument } from "../document"
import type { ErrorCode } from "../errors"
import { setFlag } from "../scenario/override-flags"
import { LEDGER_READ_CODES } from "../store"
import { carryInDocument } from "./carryin"

export { setFlag }

/** Every code the projection leaves raise: flags, the Baseline and the engine (ADR-0030). */
export const PROJECTION_ERROR_CODES: readonly ErrorCode[] = [
	"invalid_input",
	"INVALID_DATE",
	"NEGATIVE_AMOUNT",
	"AMOUNT_OVERFLOW",
	"unsupported_currency",
	"not_found",
	"projection_refused",
	...LEDGER_READ_CODES,
]

/** The `--scenario` flag that names the one Scenario a leaf projects. */
export const scenarioFlag: z.ZodString = z.string().describe("The Scenario's exact name or its id.")

/** `--as-of`, the date every projection starts at, which the caller states (ADR-0029). */
export const asOfFlag: z.ZodString = z
	.string()
	.describe("The date the Projection starts at, as YYYY-MM-DD.")

/** `--horizon`, the date every projection ends at. */
export const horizonFlag: z.ZodString = z
	.string()
	.describe("The date the Projection ends at, as YYYY-MM-DD.")

/** `--carry-in`, the one document that states what each Levy's period already tallied (ADR-0032). */
export const carryInFlag: z.ZodOptional<z.ZodString> = z
	.string()
	.optional()
	.describe(
		'Read what each Levy\'s period already tallied and prepaid from this JSON path, or - for stdin: one record per Scenario, Levy and period, {"scenario", "levy", "periodStart", "tallies": [{"label", "basis", "amount"}], "prepaid", and "rest" instead of the classes left at zero}. Amounts are decimal strings in the Currency\'s major unit, as "1200000.00" in THB, not satang. The tallies are those of the period before --as-of: a Flow that lands on or after --as-of is projected and must not be in them.',
	)

/** The document `--carry-in` names, published under `flagDocuments` so its shape is not guessed. */
export const carryInFlagDocument: FlagDocument = { flag: "carryIn", schema: carryInDocument }

/** `--horizon` for `fi`, where it moves the answer: it says which date the plan has to fund. */
export const fiHorizonFlag: z.ZodString = z
	.string()
	.describe(
		"The date the Projection ends at, as YYYY-MM-DD: the last date the plan has to fund, for example the age-95 date. FI means the money lasts until it, so a later horizon can move the FI date later.",
	)

type OutputFlag = z.ZodDefault<z.ZodBoolean>

/** One yes-or-no flag for more output: off unless given, so a run without it keeps its bytes. */
const more = (what: string): OutputFlag => z.boolean().default(false).describe(what)

/** The flags that ask `projection run` for more than the annual roll-up (cli ADR-0027). */
export const outputFlags: Record<
	"monthly" | "breakdown" | "liabilities" | "accounts" | "spending" | "estate",
	OutputFlag
> = {
	monthly: more("Also report the monthly rows."),
	breakdown: more(
		"Also report each Annual roll-up's cash flow by source, tax, category and Account, and its nine section totals (the cashflowTotals table in JSON). JSON states a zero total as 0.00; the human block leaves out a zero not funded or unmet, and withdrawals, drawn or tax when its roll-up has no line of that group.",
	),
	liabilities: more(
		"Also report each loan's statement: its months, the interest in each, and the date it is paid off.",
	),
	accounts: more(
		"Also report each Account's value on the row at each Annual roll-up's end (the date realNetWorth states), or on every month with --monthly, nominal and real (cli ADR-0060).",
	),
	spending: more(
		"Also report what each spending rule fixed and paid in each Rule year: the portfolio it read, its amount and what it paid (nominal and in today's money), its withdrawal rate and whether it cut, raised or hit a bound (cli ADR-0063). Without a rule Flow the table is empty.",
	),
	estate: more(
		"Also report what the plan would leave on the row at each Annual roll-up's end (or on every month with --monthly): the gross estate, the debts, each cost and gift the Scenario's estate block states, and what heirs receive, nominal and in today's money (cli ADR-0064). A Scenario with no estate block is stated with no cost or gift.",
	),
}
