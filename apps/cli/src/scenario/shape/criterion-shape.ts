import { metricShape } from "./metric-shape"
import { COMPARISONS, CRITERION_KINDS, DATE, MILESTONE_TERMS, MINOR_UNITS } from "./terms"

/*
 * A Milestone's criterion (sim's ADR 0012). A criterion is one object whose `kind` decides the
 * keys it carries, as an Account's `kind` decides `lockedUntil`: each key's description says which
 * kind uses it, and a key another kind carries is refused by the core. One flat object rather than
 * one per kind keeps every money field a direct property, so the decimal form converts it (ADR-0047).
 */

/** One criterion of a Milestone: its `kind` selects the keys it carries. */
export const criterionShape: Record<string, unknown> = {
	type: "object",
	description:
		"One criterion of a Milestone. `kind` decides the other keys: `date` takes `on`; `milestone` takes `milestone` and `months`; `metric` takes `metric`, `op`, `amount` and `terms`; `multiple` takes `metric`, `op`, `base`, `num`, `den` and `terms`. A key another kind uses is refused.",
	properties: {
		id: {
			type: "string",
			description: "The name this document gives the criterion, unique within its Milestone.",
		},
		kind: {
			enum: [...CRITERION_KINDS],
			description:
				"`date` holds from a date onward; `milestone` holds a number of months after another Milestone fired; `metric` compares a Metric with an amount; `multiple` compares a Metric with a multiple of another.",
		},
		on: {
			type: "string",
			description: `Date criterion only, ${DATE} It holds from this date onward.`,
		},
		milestone: {
			type: "string",
			description:
				"Milestone criterion only: the id of the Milestone whose fire date this counts from.",
		},
		months: {
			type: "integer",
			description:
				"Milestone criterion only: whole calendar months after that Milestone fired; negative counts before it.",
		},
		metric: {
			...metricShape,
			description:
				"Metric and multiple criteria only: the figure that is compared. A named balance, the sum of `accounts`, or the spending over an `expenses` window.",
		},
		op: {
			enum: [...COMPARISONS],
			description:
				"Metric and multiple criteria only: `atLeast` holds while the figure is at or above the figure it is compared with; `atMost` while it is at or below.",
		},
		amount: {
			type: "integer",
			description: `${MINOR_UNITS} Metric criteria only: the figure the Metric is compared with.`,
		},
		base: {
			...metricShape,
			description:
				"Multiple criteria only: the Metric whose figure is multiplied by `num / den` before the comparison.",
		},
		num: {
			type: "integer",
			minimum: 1,
			description:
				"Multiple criteria only: the numerator of the multiple, a positive whole number.",
		},
		den: {
			type: "integer",
			minimum: 1,
			description:
				"Multiple criteria only: the denominator of the multiple, a positive whole number.",
		},
		terms: {
			enum: [...MILESTONE_TERMS],
			description:
				"Metric and multiple criteria only: `nominal` compares money as stated; `real` deflates each amount to the Timeline's start before summing, so it is in start-of-plan money.",
		},
	},
	required: ["id", "kind"],
	additionalProperties: false,
}
