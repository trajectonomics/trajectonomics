/** The sentence that states the minor-unit form's units; the decimal form replaces it (ADR-0047). */
export const MINOR_UNITS_SENTENCE =
	"Every amount is an integer of minor units and every rate an integer of basis points, as each field's own description states."

/** The decimal form's sentence: which numbers are decimal strings, and which stay as stored. */
export const DECIMAL_UNITS_SENTENCE =
	"In this decimal form (`--decimal`) every money field is a decimal string of the Currency's major unit, such as \"9000.50\", as each field's own description states. The numbers inside a Flow's `derive` graph and inside `levies` are not money fields: they stay integers of minor units, as stored. Every rate stays an integer of basis points."

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
		`The \`check()\` of the engine bundled in @trajectonomics/cli@${simVersion}, with an empty Baseline and no Timeline, is the only validator: its codes are the only refusals, and this shape is documentation of what it accepts, with the units and closed values it cannot state itself (ADR-0024).`,
		"What this version cannot do is listed by `traj schema`.",
	].join(" ")
}
