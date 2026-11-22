/** The sentence that states the minor-unit form's units; the decimal form replaces it (ADR-0047). */
export const MINOR_UNITS_SENTENCE =
	"Every amount is an integer of minor units and every rate an integer of basis points, as each field's own description states."

/** The decimal form's sentence: which numbers are decimal strings, and which stay as stored. */
export const DECIMAL_UNITS_SENTENCE =
	"In this decimal form (`--decimal`) every money field is a decimal string of the Currency's major unit, such as \"9000.50\", as each field's own description states. The numbers inside a Flow's `derive` graph and inside `levies` are not money fields: they stay integers of minor units, as stored. Every rate stays an integer of basis points."

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
		`The \`check()\` of the engine bundled in @trajectonomics/cli@${simVersion}, with an empty Baseline and no Timeline, is the only validator: its codes are the only refusals, and this shape is documentation of what it accepts, with the units and closed values it cannot state itself (ADR-0024).`,
		"What this version cannot do is listed by `traj schema`.",
	].join(" ")
}
