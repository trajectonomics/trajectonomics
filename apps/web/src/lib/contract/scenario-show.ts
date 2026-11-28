import { z } from "zod"
import { assumedItem } from "./assumed"
import { householdDocument } from "./household"
import { money } from "./money"
import { scenarioAccount } from "./scenario-account"
import { scenarioCashflow } from "./scenario-cashflow"
import { scenarioFlow } from "./scenario-flow"
import { taxShown } from "./tax-profile"

export { type ScenarioAccount, scenarioAccount } from "./scenario-account"
export { type ScenarioFlow, scenarioFlow } from "./scenario-flow"

/**
 * The closed vocabularies of a Flow (`kind` and `frequency`) and an Account (`kind`) live in
 * `scenario-flow.ts` and `scenario-account.ts`, where the pages branch on them. Every other word list
 * (compounding, rounding, a payout's frequency) is shown only, so it is a plain string. The estate line
 * below keeps its rounding a plain string for the same reason.
 */

/**
 * What the page reads of one Milestone: the id the plan addresses it by, and the name a person reads (sim ADR 0032). A
 * document keeps its Milestones as they are, so a parsed document serializes them in the CLI's own key order; the
 * lookup reads this shape off an entry without writing a copy back (web ADR 0021's Demo bytes depend on it).
 */
export const milestoneLabel = z.looseObject({
	id: z.string(),
	// What a person reads in place of the id; the id still addresses the Milestone.
	displayLabel: z.string().optional(),
})
export type MilestoneLabel = z.infer<typeof milestoneLabel>

/**
 * One cost or gift of the estate block in the decimal form (cli ADR 0064): a share (`of`, `bps` as a percent string such
 * as "1.00", `rounding`) or a fixed `amount` in major units that grows by `growth`. `view/estate/` reads it; any key it
 * does not know is kept as it is.
 */
export const estateLine = z.looseObject({
	id: z.string(),
	of: z.union([z.string(), z.looseObject({ accounts: z.array(z.string()) })]).optional(),
	bps: z.string().optional(),
	rounding: z.string().optional(),
	amount: money.optional(),
	growth: z.union([z.literal("inflation"), z.looseObject({ bps: z.number().int() })]).optional(),
})
export type EstateLine = z.infer<typeof estateLine>

/** The Scenario's optional `estate` block: the costs of settling what the plan leaves, then the gifts, each in order. */
export const estateBlock = z.looseObject({
	costs: z.array(estateLine).optional(),
	gifts: z.array(estateLine).optional(),
})
export type EstateBlock = z.infer<typeof estateBlock>

/** The Scenario document in its decimal form. Its other sections are kept as they are. */
export const scenarioDocument = z.looseObject({
	currency: z.string(),
	flows: z.array(scenarioFlow),
	accounts: z.array(scenarioAccount),
	// Where the money goes: the routing forms (cli ADR-0070). Optional so a document without it still decodes, and kept as it is.
	cashflow: scenarioCashflow.optional(),
	// The assumptions of the whole plan: inflation per year in basis points, which is an integer in the decimal form too.
	// The inflation swing is optional (cli ADR-0085), and the page only shows it: its Edit field is a later issue.
	economy: z
		.looseObject({
			inflation: z.number().int(),
			inflationVolatility: z.number().int().optional(),
		})
		.optional(),
	// The Levies the plan is taxed under; the page reads only whether there is one, so each is kept as it is.
	levies: z.array(z.unknown()).optional(),
	// The costs and gifts of the estate, when the plan states them (cli ADR 0064); none is shipped, each is the person's own.
	estate: estateBlock.optional(),
	// The named points a Flow may gate on (sim ADR 0012): the page reads a Milestone's id and label through `milestoneLabel`,
	// and keeps each entry as it is, so it serializes in the CLI's own key order. Declared last so a parsed document
	// serializes it after `estate`, where the CLI's canonical bytes put it: the keys the contract does not name
	// (`schemaVersion`) follow it, as they followed it before this key was declared.
	milestones: z.array(z.unknown()).optional(),
})
export type ScenarioDocument = z.infer<typeof scenarioDocument>

/** `traj scenario show <name> --decimal --json`: one Scenario with its document. */
export const scenarioShow = z.strictObject({
	scenario: z.strictObject({
		id: z.string(),
		name: z.string(),
		contentHash: z.string(),
		forkedFrom: z.string().nullable(),
		version: z.number().int(),
		createdAt: z.string(),
		updatedAt: z.string(),
		document: scenarioDocument,
		/** The household's document, or null when no household is set (cli ADR-0048). */
		household: householdDocument.nullable(),
		/**
		 * The hash of the document and household together: what a household Edit sends with `--if-hash` (cli ADR-0055).
		 * Branded, so a `contentHash` or any other string cannot be passed where a household write wants this one.
		 */
		householdHash: z.string().brand<"HouseholdHash">(),
		// The stored tax profile, whether the plan is taxed and which deduction classes it states (cli ADR-0066, ADR-0073).
		...taxShown,
		/**
		 * The values the plan assumes that nobody stated, in kind order (cli ADR-0083), empty when it
		 * assumes none. `template-default` arrives with #689 part 2, and the field is absent in an
		 * older Snapshot.
		 */
		assumed: z.array(assumedItem).optional(),
		/** The notes kept on the plan, or null when it has none (cli ADR-0071); absent in an older Snapshot. */
		notes: z.string().nullable().optional(),
		/** True for the ledger's main plan, a label and not a default (cli ADR-0071); absent in an older Snapshot. */
		main: z.boolean().optional(),
	}),
})
export type ScenarioShow = z.infer<typeof scenarioShow>
