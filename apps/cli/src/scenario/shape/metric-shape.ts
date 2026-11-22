import { METRIC_NAMES, REFERENCE_WINDOWS } from "./terms"

/** A Metric as the document writes it: a named balance, `{ accounts }` or `{ expenses }`. */
export const metricShape: Record<string, unknown> = {
	anyOf: [
		{ enum: [...METRIC_NAMES], description: "A named balance the plan reports on a date." },
		{
			type: "object",
			properties: {
				accounts: {
					type: "array",
					items: { type: "string" },
					description:
						"The Accounts whose balances are summed. Every one must be of one kind, asset or liability.",
				},
			},
			required: ["accounts"],
			additionalProperties: false,
			description: "The sum of the named Accounts' balances.",
		},
		{
			type: "object",
			properties: {
				expenses: {
					enum: [...REFERENCE_WINDOWS],
					description:
						"The planned spending over one twelve-month window, from the date the criterion is judged.",
				},
			},
			required: ["expenses"],
			additionalProperties: false,
			description: "The spending over one twelve-month window.",
		},
	],
}
