import { labelSetsSentence } from "../tax/labels"
import { fundingShape } from "./flow-funding"
import { cappedPrepaymentShape, deriveShape, levelShape, prepaymentsShape } from "./flow-parts"
import { BASIS_POINTS, CONTRIBUTION_CAP, DATE, FLOW_KINDS, FREQUENCIES, MINOR_UNITS } from "./terms"

/** One income, expense, contribution or withdrawal Flow, with the unit of every number it states. */
export const flowShape: Record<string, unknown> = {
	type: "object",
	description:
		"One income, expense, contribution or withdrawal Flow. `earned` is required on an income Flow, `target` on a contribution Flow and `source` on a withdrawal Flow; `funding` is a contribution into an asset's alone; `category` is an expense's alone; `label`, `prepayments` and `cappedPrepayment` apply to the kinds they name; and exactly one of `amount`, `derive` and `level` is required, the first bringing `growth` with it.",
	properties: {
		id: {
			type: "string",
			description: "The name this document gives the Flow, unique within it and never changed.",
		},
		kind: {
			enum: [...FLOW_KINDS],
			description:
				"`income` earns, `expense` spends, `contribution` moves money into the Account its `target` names, and `withdrawal` moves money into cashflow from the Account its `source` names: it borrows from a liability, or sells an asset.",
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
		category: {
			type: "string",
			minLength: 1,
			maxLength: 64,
			description:
				"Expense only: a free-text group for reports, 1 to 64 characters with no control characters. It changes no figure; the engine never reads it.",
		},
		target: {
			type: "string",
			description: `Contribution only: the Account the money moves into. A liability target is a debt payment, capped at the amount owed; for an asset target ${CONTRIBUTION_CAP}: spread it as a monthly Flow instead, and list the asset in \`cashflow.contribute\`. To buy an asset that must be paid even when the day's income does not cover it, state \`funding: "obligation"\`.`,
		},
		funding: fundingShape,
		derive: {
			...deriveShape,
			description: `${deriveShape["description"]} Required unless the Flow states \`amount\` or \`level\`.`,
		},
		level: levelShape,
		source: {
			type: "string",
			description:
				"Withdrawal only: the Account the money comes from. A liability's amount owed grows by each landed amount and the same cash lands in cashflow, so net worth does not move. An asset is sold: `min(amount, value)` leaves it and lands in cashflow, nothing while it is locked, and a `derive` graph that reads the Account with an `account` Measure sells all of it. The cash is not income and never counts toward Available cashflow. A sale of an asset marked `liquid: false` raises accessible net worth by the cash that lands. A start before the asset's `lockedUntil`, with no `startAt`, is refused.",
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
