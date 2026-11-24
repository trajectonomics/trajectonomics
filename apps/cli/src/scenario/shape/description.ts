import { EMPLOYER_FLOW, PAYOUT_ACCOUNT } from "./example-income"

/** The sentence that states the minor-unit form's units; the decimal form replaces it (ADR-0047). */
export const MINOR_UNITS_SENTENCE =
	"Every amount is an integer of minor units and every rate an integer of basis points, as each field's own description states."

/** The decimal form's sentence: which numbers are decimal strings, and which stay as stored. */
export const DECIMAL_UNITS_SENTENCE =
	"In this decimal form (`--decimal`) every money field is a decimal string of the Currency's major unit, such as \"9000.50\", as each field's own description states. The numbers inside a Flow's `derive` graph and inside `levies` are not money fields: they stay integers of minor units, as stored. Every rate stays an integer of basis points, except those of a Spending rule, of an estate line and of an Account's `payout` and `fee`, which are percent strings such as \"4.00\", as each field's own description states."

/**
 * A one-off what-if as a Flow: a lump-sum prepayment of a loan, which a `once` contribution to the
 * liability states without a ledger write. A test proves the pinned core accepts it.
 */
export const PREPAYMENT_FLOW = {
	id: "prepay",
	kind: "contribution",
	frequency: "once",
	start: "2027-01-01",
	amount: 50_000_000,
	growth: { bps: 0 },
	target: "loan",
} as const

/**
 * A spending rule as an expense Flow: a share of the savings fixed in the first year, then grown by
 * inflation. The rate is a stated example value, never a default (cli ADR-0063). A test proves the
 * pinned core accepts it beside the example's Accounts.
 */
export const INITIAL_RATE_FLOW = {
	id: "level-spending",
	kind: "expense",
	frequency: "monthly",
	start: "2045-01-01",
	rule: {
		kind: "initialRate",
		portfolio: ["cash", "index"],
		rateBps: 350,
		rounding: "floor",
	},
} as const

/**
 * The document's prose: what the numbers mean, read before the properties are. It names the
 * validator and the pinned version it was written against, so a reader can tell documentation of
 * `check()` from a schema that would validate on its own (ADR-0024).
 */
export function scenarioShapeDescription(simVersion: string): string {
	return [
		"A Scenario document: the assumptions a Projection runs on, in `@trajectonomics/core/sim`'s Scenario version.",
		MINOR_UNITS_SENTENCE,
		"An Account's `id` is the name this document gives it, and every other reference uses that name; a projection also accepts the Ledger Account's own id, which `traj baseline show --json` lists.",
		"A Flow's `amount` is a positive magnitude, never a signed posting: `kind` decides the direction, and an expense Flow spends what it names.",
		`A one-off what-if, such as a lump-sum loan prepayment, is a Flow of this document and leaves the ledger alone: a \`once\` contribution to the liability, here 500,000.00 THB on a loan named "loan": ${JSON.stringify(PREPAYMENT_FLOW)}.`,
		"A real asset, such as a home, is composed of the parts above and has no model of its own: an asset Account marked `liquid: false`, an obligation Contribution that buys it, a liability with a level payment that finances it, Flows whose `derive` reads its value for the running cost, an income Flow for the rent, and a `withdrawal` from it that sells it; the worked example shows each. Every rate and share in it is the caller's, and `traj` ships none. Whether the rent or the gain of a sale is taxed is the caller's choice of Tally label, which the example does not state.",
		`A retirement spending rule is an expense Flow with a \`rule\` in place of an amount: a share of what the savings are worth, fixed once a Rule year. \`initialRate\` fixes the first year's amount as a share and grows it by inflation, here 3.5% of cash and index: ${JSON.stringify(INITIAL_RATE_FLOW)}. \`currentRate\` takes a share of what the savings are worth each year, with optional rate \`steps\`, a \`floor\` and a \`ceiling\`. \`guardrails\`, which the worked example's \`retirement-spending\` states from its \`retire\` Milestone, starts as \`initialRate\`, then cuts after the share has grown too large and raises it after it has grown too small. Every rate, band, bound and rounding in a rule is the caller's own, and \`traj\` ships none: the example's figures are stated examples, not advice. An amount that keeps pace with inflation needs no rule: it is an expense with \`growth: "inflation"\`.`,
		`What an asset Account earns and costs, and what an employer adds, are the document's own fields, and every rate in them is the caller's: \`traj\` ships none, and the worked example's figures are stated examples, not advice. An Account's \`payout\` pays a yearly share of its value out as passive income (not earned, so it carries spending after work stops) while the rest of its \`rate\` compounds, and a payout of 0 bps is none; under a Thai Levy label a dividend payout \`income.section40_4.dividends\` and an interest payout \`income.section40_4.interest\`. An Account's \`fee\` charges a yearly share of its value a twelfth at a time, outside cashflow, on every Market path, and \`returnLabel\` counts growth net of it. An employer's share is a Contribution with \`funding: "employer"\`, usually a \`derive\` that reads a share of the salary Flow: it lands in the Account outside the household's cash and stops with earned income. An Account that pays out 3.5% a year a quarter at a time and charges 1.5% a year: ${JSON.stringify(PAYOUT_ACCOUNT)}. The employer's 5% of the salary into \`pension\`: ${JSON.stringify(EMPLOYER_FLOW)}. Only a member's own contribution is deductible, so an employer Contribution carries none of the Levy's contribution labels, \`allowance.thai_esg\` included.`,
		"An optional `estate` block states what the plan would leave: the costs of settling it and the gifts made from it, which `traj projection run --estate` sets beside the gross estate (every asset Account, the home and locked Accounts included), the debts and what heirs receive. A cost or gift is a share of a base or a fixed amount that keeps pace as the caller says, and every one is the caller's own: `traj` ships none, and the worked example's 1% settlement cost, 3% selling cost of the home and 5% gift to a temple are stated example values, not advice. Thai inheritance tax is not modelled: an inheritance tax, a transfer fee or a stamp duty is a cost line the caller types.",
		`The \`check()\` of the engine bundled in @trajectonomics/cli@${simVersion}, with an empty Baseline and no Timeline, is the only validator: its codes are the only refusals, and this shape is documentation of what it accepts, with the units and closed values it cannot state itself (ADR-0024).`,
		"What this version cannot do is listed by `traj schema`.",
	].join(" ")
}
