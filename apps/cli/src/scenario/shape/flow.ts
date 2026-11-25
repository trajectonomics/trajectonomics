import { DISPLAY_LABEL_RULE, EXPENSE_CATEGORY_RULE } from "@trajectonomics/core/sim"
import { labelSetsSentence } from "../tax/labels"
import { fundingShape } from "./flow-funding"
import { cappedPrepaymentShape, deriveShape, levelShape, prepaymentsShape } from "./flow-parts"
import { growthShape } from "./growth-shape"
import { flowRuleShape } from "./rule-shape"
import { CONTRIBUTION_CAP, DATE, FLOW_KINDS, FREQUENCIES, MINOR_UNITS } from "./terms"

/** One income, expense, contribution or withdrawal Flow, with the unit of every number it states. */
export const flowShape: Record<string, unknown> = {
	type: "object",
	description:
		"One income, expense, contribution, withdrawal or transfer Flow. `earned` is required on an income Flow, `target` on a contribution Flow, `source` on a withdrawal Flow and both `source` and `target` on a transfer Flow; `funding` is a contribution into an asset's alone; `realise` is a transfer's alone; `category` is an expense's alone; `label`, `prepayments` and `cappedPrepayment` apply to the kinds they name; and exactly one of `amount`, `derive`, `level` and `rule` is required, the first bringing `growth` with it and `rule` an expense's alone.",
	properties: {
		id: {
			type: "string",
			description: "The name this document gives the Flow, unique within it and never changed.",
		},
		displayLabel: {
			type: "string",
			minLength: 1,
			maxLength: 80,
			description: `What a person reads in place of the id, written as ${DISPLAY_LABEL_RULE}. It is no key: the id still addresses the Flow, and the label may repeat or change. It changes no figure (sim ADR 0032).`,
		},
		kind: {
			enum: [...FLOW_KINDS],
			description:
				"`income` earns, `expense` spends, `contribution` moves money into the Account its `target` names, `withdrawal` moves money into cashflow from the Account its `source` names (it borrows from a liability, or sells an asset), and `transfer` moves money between two of the plan's own Accounts, outside cashflow: it is no income, spending or saving, and net worth is the same before and after it.",
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
			description: `${MINOR_UNITS} The same figure every occurrence, grown from \`start\` by \`growth\`. Required unless the Flow states \`derive\`, \`level\` or \`rule\`.`,
		},
		growth: growthShape(
			'The yearly step applied to `amount` from `start`. Required wherever `amount` is stated, a `once` Flow included, where `{ "bps": 0 }` means no step; a Flow that states `derive`, `level` or `rule` forbids it.',
		),
		earned: {
			type: "boolean",
			description:
				"Income only. `true` stops when earning stops, so the FI date depends on it; `false` continues.",
		},
		label: {
			type: "string",
			description: `Income and contribution only: the Tally label a Levy sums this Flow under, written by \`traj scenario tax --label\`. A Flow without one is not tax-free, it is income no Levy is told about. ${labelSetsSentence()} A joint Return over Filers (cli ADR-0075) stores the label with its Owner's suffix, such as income.section40_1@me or income.section40_1@shared. Needs a Levy.`,
		},
		prepayments: prepaymentsShape,
		cappedPrepayment: cappedPrepaymentShape,
		category: {
			type: "string",
			minLength: 1,
			maxLength: 64,
			description: `Expense only: a group name for reports, written as ${EXPENSE_CATEGORY_RULE}. It changes no figure; the engine never reads it.`,
		},
		target: {
			type: "string",
			description: `Contribution and transfer only: the Account the money moves into. A transfer's target is an asset, an illiquid or a locked one too, or a liability, which it pays down and never takes below zero owed, and it is not the transfer's \`source\`. A liability target is a debt payment, capped at the amount owed; for an asset target ${CONTRIBUTION_CAP}: spread it as a monthly Flow instead, and list the asset in \`cashflow.contribute\`. To buy an asset that must be paid even when the day's income does not cover it, state \`funding: "obligation"\`.`,
		},
		funding: fundingShape,
		derive: {
			...deriveShape,
			description: `${deriveShape["description"]} Required unless the Flow states \`amount\`, \`level\` or \`rule\`.`,
		},
		level: levelShape,
		rule: flowRuleShape,
		source: {
			type: "string",
			description:
				"Withdrawal and transfer only: the Account the money comes from. A withdrawal's source: a liability's amount owed grows by each landed amount and the same cash lands in cashflow, so net worth does not move. An asset is sold: `min(amount, value)` leaves it and lands in cashflow, nothing while it is locked, and a `derive` graph that reads the Account with an `account` Measure sells all of it. The cash is not income and never counts toward Available cashflow. A sale of an asset marked `liquid: false` raises accessible net worth by the cash that lands. A start before the asset's `lockedUntil`, with no `startAt`, is refused. A transfer's source is an asset that is not marked `liquid: false` (a sale of that is a withdrawal), never a liability (borrowing is a withdrawal); it moves nothing while it is locked, and what it moves is `min(planned, what it holds, what the target still owes)`, never an overdraft: the rest is `unmoved` in the cash-flow breakdown and is no Shortfall.",
		},
		realise: {
			type: "boolean",
			description:
				"Transfer only. `false`, the default, moves the source's Cost basis with the money and tallies no gain at the transfer; the gain is tallied when the target is sold. `true` books the transfer as a sale of the source, tallying its Realised gain under its `gainLabel`, and starts a gain-tracked target's basis at the amount moved.",
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
