import { MAX_LEVEL_PAYMENTS } from "@trajectonomics/core/sim"
import { BASIS_POINTS, DERIVE_MEASURE_OPS, PRINCIPAL_UNITS, ROUNDINGS } from "./terms"

/*
 * The parts of a Flow whose keys are not simply a name and a unit: the two shapes a Levy reads a
 * share of each occurrence from, the Measure graph a derived amount is computed by, and the loan a
 * level payment is priced from. They live here so `flow.ts` stays one screen long, and every one of
 * them states its kind or `Needs a Levy` rule.
 */

/** Contribution into a nominal liability only: the loan one level payment pays off (ADR-0016). */
export const levelShape: Record<string, unknown> = {
	type: "object",
	description:
		"Contribution only, into a liability with a `compounding` period: the loan one level payment pays off. The payment is computed once, from `principal`, the liability's rate and `payments` equal payments, and it does not grow. It takes the place of `amount` and `growth`, and the Flow's `frequency` is that compounding period (`monthly`, `quarterly` or `annual`).",
	properties: {
		principal: { type: "integer", description: `${PRINCIPAL_UNITS} The amount borrowed.` },
		payments: {
			type: "integer",
			minimum: 1,
			maximum: MAX_LEVEL_PAYMENTS,
			description: `The number of equal payments, a whole number from 1 to ${MAX_LEVEL_PAYMENTS}.`,
		},
		rounding: {
			enum: [...ROUNDINGS],
			description:
				"How the one exact payment rounds to a minor unit: `floor` rounds down, `halfUp` to the nearest with a half rounding up, `ceil` up. Required, with no default.",
		},
	},
	required: ["principal", "payments", "rounding"],
	additionalProperties: false,
}

/** Income only: shares of each occurrence taken at source, one per Levy. */
export const prepaymentsShape: Record<string, unknown> = {
	type: "array",
	description:
		"Income only: shares of each occurrence taken at source, one per Levy. Needs a Levy.",
	items: {
		type: "object",
		properties: {
			levy: { type: "string", description: "The Levy's id, as the Scenario spells it." },
			bps: { type: "integer", description: `${BASIS_POINTS} Share of the gross taken at source.` },
		},
		required: ["levy", "bps"],
		additionalProperties: false,
	},
}

/** Income only: a second share taken at source, capped by a `const` Measure of the Levy. */
export const cappedPrepaymentShape: Record<string, unknown> = {
	type: "object",
	description:
		"Income only: a second share taken at source, capped by a Measure of the Levy. Needs a Levy.",
	properties: {
		levy: { type: "string", description: "The Levy's id, as the Scenario spells it." },
		bps: { type: "integer", description: `${BASIS_POINTS} Share of the gross taken at source.` },
		upTo: {
			type: "string",
			description: "The id of a `const` Measure of that Levy that caps the share.",
		},
	},
	required: ["levy", "bps", "upTo"],
	additionalProperties: false,
}

/** One Measure of a Flow's graph; the keys after `op` belong to that operation. */
const measureShape = {
	type: "object",
	description:
		"One Measure: `const` reads `value` (with `asOf` and `growth`, or `steps`), `add`/`sub`/`min`/`max` read `a` and `b`, `scale` reads `of`, `num`, `den` and `rounding`, `mul` reads `a`, `b`, `den` and `rounding`, `pick` reads `a`, `b`, `then` and `else`, and `flow` reads another Flow's landed amount. A `tally` Measure belongs to a Levy, not to a Flow.",
	properties: {
		id: { type: "string", description: "The Measure's id, local to this graph." },
		op: {
			enum: [...DERIVE_MEASURE_OPS],
			description:
				"Which operation it is. A `tally` Measure belongs to a Levy, so it is not one of these.",
		},
		rounding: {
			enum: [...ROUNDINGS],
			description:
				"`scale` and `mul` only, and required there: how the quotient by `den` rounds. `floor` rounds down, `halfUp` to the nearest with a half rounding up, `ceil` up. No other word is accepted, `halfEven` included.",
		},
	},
	required: ["id", "op"],
}

/** An amount computed per occurrence from a Measure graph, in place of `amount` and `growth`. */
export const deriveShape: Record<string, unknown> = {
	type: "object",
	description:
		"An amount computed per occurrence from a Measure graph, in place of `amount` and `growth`. A derived expense, or a derived contribution into a liability, cannot read an earned income Flow, directly or through other derived Flows: earned income stops at the FI date, so the amount would drop when earned income stops. `traj fi` and `traj projection compare` refuse it as DERIVED_EXPENSE_READS_EARNED (DERIVED_DEBT_PAYMENT_READS_EARNED for the liability), though `traj projection run` accepts it; derive it from a Flow that is not earned instead.",
	properties: {
		measures: {
			type: "array",
			description: "The graph, whose Measure ids are local to this Flow.",
			items: measureShape,
		},
		result: {
			type: "string",
			description: "The id of the Measure that is this Flow's amount.",
		},
	},
	required: ["measures", "result"],
	additionalProperties: false,
}
