import { z } from "zod"
import { dateString } from "./date"
import { money } from "./money"

/**
 * A Flow of a Scenario document in the decimal form (`traj scenario show --decimal --json`). Only the
 * fields the planner pages show are typed; `looseObject` keeps every other field, so a save returns it
 * untouched. Every amount is the CLI's decimal string, and every rate an integer of basis points.
 * A `withdrawal` borrows from its `source`, or sells an asset; a `level` Contribution takes the place of
 * `amount` (cli ADR-0016); a `derive` computes the amount from an Account's value (sim ADR 0020).
 *
 * Its `kind` and `frequency` are the closed vocabularies the pages branch on, so they stay enums, and
 * `scripts/contract-vocabularies.test.ts` fails when `traj schema` lists other words.
 */
export const scenarioFlow = z.looseObject({
	id: z.string(),
	kind: z.enum(["income", "expense", "contribution", "withdrawal", "transfer"]),
	frequency: z.enum(["once", "daily", "weekly", "biweekly", "monthly", "quarterly", "annual"]),
	start: dateString,
	end: dateString.optional(),
	amount: money.optional(),
	growth: z.union([z.literal("inflation"), z.looseObject({ bps: z.number().int() })]).optional(),
	earned: z.boolean().optional(),
	// The Tally label a Levy reads the Flow under, such as an income class for tax (cli ADR-0010).
	label: z.string().optional(),
	target: z.string().optional(),
	source: z.string().optional(),
	// A transfer's only: whether it tallies the source's Realised gain as a sale (sim ADR 0031, cli ADR-0070).
	realise: z.boolean().optional(),
	// "obligation" pays a Contribution in full on its date, before Available cashflow (sim ADR 0021); "employer" lands the employer's share outside the household's cash (sim ADR 0026).
	funding: z.string().optional(),
	// An expense's free-text group (cli schema, #278). The engine never reads it.
	category: z.string().optional(),
	derive: z.looseObject({}).optional(),
	// A Milestone's id: the Flow lands on or after (`startAt`) or strictly before (`endAt`) its fire date (sim ADR 0012).
	startAt: z.string().optional(),
	endAt: z.string().optional(),
	// A spending rule in place of `amount` (cli ADR 0063); `view/withdrawals/rule.ts` reads it, so a shape it does not know stays untouched.
	rule: z.looseObject({}).optional(),
	// Read-only: the CLI states the bounds of `payments` and the `rounding` words (sim ADR-0016), so the contract
	// takes any integer and any string. A bound that moves in the CLI then cannot fail as `contract_mismatch` (#336).
	level: z
		.looseObject({
			principal: money,
			payments: z.number().int(),
			rounding: z.string(),
		})
		.optional(),
})
export type ScenarioFlow = z.infer<typeof scenarioFlow>
