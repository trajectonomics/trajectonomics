import { z } from "zod"
import { dateString } from "./date"
import { householdDocument } from "./household"
import { money } from "./money"

/**
 * A Flow of a Scenario document in the decimal form (`traj scenario show --decimal --json`). Only the
 * fields the planner pages show are typed; `looseObject` keeps every other field, so a save returns it
 * untouched. Every amount is the CLI's decimal string, and every rate an integer of basis points.
 * A `withdrawal` borrows from its `source`, or sells an asset; a `level` Contribution takes the place of
 * `amount` (cli ADR-0016); a `derive` computes the amount from an Account's value (sim ADR 0020).
 */
export const scenarioFlow = z.looseObject({
	id: z.string(),
	kind: z.enum(["income", "expense", "contribution", "withdrawal"]),
	frequency: z.enum(["once", "daily", "weekly", "biweekly", "monthly", "quarterly", "annual"]),
	start: dateString,
	end: dateString.optional(),
	amount: money.optional(),
	growth: z.union([z.literal("inflation"), z.looseObject({ bps: z.number().int() })]).optional(),
	earned: z.boolean().optional(),
	target: z.string().optional(),
	source: z.string().optional(),
	// "obligation" pays a Contribution in full on its date, before Available cashflow (sim ADR 0021).
	funding: z.string().optional(),
	// An expense's free-text group (cli schema, #278). The engine never reads it.
	category: z.string().optional(),
	derive: z.looseObject({}).optional(),
	// A Milestone's id: the Flow lands on or after (`startAt`) or strictly before (`endAt`) its fire date (sim ADR 0012).
	startAt: z.string().optional(),
	endAt: z.string().optional(),
	// A spending rule in place of `amount` (cli ADR 0063); `view/withdrawals/rule.ts` reads it, so a shape it does not know stays untouched.
	rule: z.looseObject({}).optional(),
	level: z
		.looseObject({
			principal: money,
			payments: z.number().int().min(1).max(119976),
			rounding: z.enum(["floor", "halfUp", "ceil"]),
		})
		.optional(),
})
export type ScenarioFlow = z.infer<typeof scenarioFlow>

/** An Account a Scenario assumes: its name in the document, its kind, and its rate in basis points. */
export const scenarioAccount = z.looseObject({
	id: z.string(),
	kind: z.enum(["asset", "liability"]),
	rate: z.number().int(),
	compounding: z.enum(["monthly", "quarterly", "semiannual", "annual"]).optional(),
	lockedUntil: dateString.optional(),
	// false marks an asset that is in net worth but not accessible: a home or a car (sim ADR 0019).
	liquid: z.boolean().optional(),
})
export type ScenarioAccount = z.infer<typeof scenarioAccount>

/**
 * One cost or gift of the estate block in the decimal form (cli ADR 0064): a share (`of`, `bps` as a percent string such
 * as "1.00", `rounding`) or a fixed `amount` in major units that grows by `growth`. `view/estate/` reads it; any key it
 * does not know is kept as it is.
 */
export const estateLine = z.looseObject({
	id: z.string(),
	of: z.union([z.string(), z.looseObject({ accounts: z.array(z.string()) })]).optional(),
	bps: z.string().optional(),
	rounding: z.enum(["floor", "halfUp", "ceil"]).optional(),
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
	// The Levies the plan is taxed under; the page reads only whether there is one, so each is kept as it is.
	levies: z.array(z.unknown()).optional(),
	// The costs and gifts of the estate, when the plan states them (cli ADR 0064); none is shipped, each is the person's own.
	estate: estateBlock.optional(),
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
	}),
})
export type ScenarioShow = z.infer<typeof scenarioShow>
