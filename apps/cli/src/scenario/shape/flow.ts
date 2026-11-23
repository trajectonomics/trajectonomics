import { labelSetsSentence } from "../tax/labels"
import { cappedPrepaymentShape, deriveShape, levelShape, prepaymentsShape } from "./flow-parts"
import { BASIS_POINTS, CONTRIBUTION_CAP, DATE, FLOW_KINDS, FREQUENCIES, MINOR_UNITS } from "./terms"

/** One income, expense, contribution or withdrawal Flow, with the unit of every number it states. */
export const flowShape: Record<string, unknown> = {
	type: "object",
	description:
		"One income, expense, contribution or withdrawal Flow. `earned` is required on an income Flow, `target` on a contribution Flow and `source` on a withdrawal Flow; `label`, `prepayments` and `cappedPrepayment` apply to the kinds they name; and exactly one of `amount`, `derive` and `level` is required, the first bringing `growth` with it.",
	properties: {
		id: {
			type: "string",
			description: "The name this document gives the Flow, unique within it and never changed.",
		},
		kind: {
			enum: [...FLOW_KINDS],
			description:
				"`income` earns, `expense` spends, `contribution` moves money into the Account its `target` names, and `withdrawal` borrows from the liability its `source` names.",
		},
		frequency: {
			enum: [...FREQUENCIES],
			description:
				"How often it lands. A `once` Flow lands on `start` alone, so its `end` may only repeat `start`.",
		},
		start: { type: "string", description: `The first date it can land, as ${DATE}` },
		end: {
			type: "string",
			description: `The last date it can land, as ${DATE} Omit it and the Flow runs to the horizon.`,
		},
		amount: {
			type: "integer",
			description: `${MINOR_UNITS} The same figure every occurrence, grown from \`start\` by \`growth\`. Required unless the Flow states \`derive\` or \`level\`.`,
		},
		growth: {
			anyOf: [
				{ const: "inflation", description: "Follow `economy.inflation`." },
				{
					type: "object",
					properties: {
						bps: {
							type: "integer",
							description: `${BASIS_POINTS} Per year; negative steps it down.`,
						},
					},
					required: ["bps"],
					additionalProperties: false,
				},
			],
			description:
				'The yearly step applied to `amount` from `start`. Required wherever `amount` is stated, a `once` Flow included, where `{ "bps": 0 }` means no step; a Flow that states `derive` or `level` forbids it.',
		},
		earned: {
			type: "boolean",
			description:
				"Income only. `true` stops when earning stops, so the FI date depends on it; `false` continues.",
		},
		label: {
			type: "string",
			description: `Income and contribution only: the Tally label a Levy sums this Flow under, written by \`traj scenario tax --label\`. A Flow without one is not tax-free, it is income no Levy is told about. ${labelSetsSentence()} Needs a Levy.`,
		},
		prepayments: prepaymentsShape,
		cappedPrepayment: cappedPrepaymentShape,
		target: {
			type: "string",
			description: `Contribution only: the Account the money moves into. A liability target is a debt payment, capped at the amount owed; for an asset target ${CONTRIBUTION_CAP}: spread it as a monthly Flow instead, and list the asset in \`cashflow.contribute\`.`,
		},
		derive: {
			...deriveShape,
			description: `${deriveShape["description"]} Required unless the Flow states \`amount\` or \`level\`.`,
		},
		level: levelShape,
		source: {
			type: "string",
			description:
				"Withdrawal only: the liability Account the money is borrowed from. Its amount owed grows by each landed amount, and the same cash lands in cashflow, so net worth does not move. It is not income, and it must be a liability.",
		},
		startAt: {
			type: "string",
			description:
				"A Milestone's id: the Flow lands only on or after that Milestone's fire date. Recurrence and growth stay anchored on `start`.",
		},
		endAt: {
			type: "string",
			description:
				"A Milestone's id: the Flow lands only strictly before that Milestone's fire date. Recurrence and growth stay anchored on `start`.",
		},
	},
	required: ["id", "kind", "frequency", "start"],
	additionalProperties: false,
}
