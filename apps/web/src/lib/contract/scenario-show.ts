import { z } from "zod"
import { dateString } from "./date"
import { householdDocument } from "./household"
import { money } from "./money"

/**
 * A Flow of a Scenario document in the decimal form (`traj scenario show --decimal --json`). Only the
 * fields the planner pages show are typed; `looseObject` keeps every other field, so a save returns it
 * untouched. Every amount is the CLI's decimal string, and every rate an integer of basis points.
 */
export const scenarioFlow = z.looseObject({
	id: z.string(),
	kind: z.enum(["income", "expense", "contribution"]),
	frequency: z.enum(["once", "daily", "weekly", "biweekly", "monthly", "quarterly", "annual"]),
	start: dateString,
	end: dateString.optional(),
	amount: money.optional(),
	growth: z.union([z.literal("inflation"), z.looseObject({ bps: z.number().int() })]).optional(),
	earned: z.boolean().optional(),
	target: z.string().optional(),
	derive: z.looseObject({}).optional(),
})
export type ScenarioFlow = z.infer<typeof scenarioFlow>

/** An Account a Scenario assumes: its name in the document, its kind, and its rate in basis points. */
export const scenarioAccount = z.looseObject({
	id: z.string(),
	kind: z.enum(["asset", "liability"]),
	rate: z.number().int(),
	compounding: z.enum(["monthly", "quarterly", "semiannual", "annual"]).optional(),
	lockedUntil: dateString.optional(),
})
export type ScenarioAccount = z.infer<typeof scenarioAccount>

/** The Scenario document in its decimal form. Its other sections are kept as they are. */
export const scenarioDocument = z.looseObject({
	currency: z.string(),
	flows: z.array(scenarioFlow),
	accounts: z.array(scenarioAccount),
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
