import { z } from "zod"
import type { Leaf } from "../../command"
import { defineCommand } from "../../command"
import { IF_HASH } from "../../scenario/if-hash"
import {
	FILING_STATUSES,
	labelFlagDescription,
	MODE_FLAGS,
	TAX_ALLOWANCE_CLASSES,
	taxExamples,
	writeTax,
} from "../../scenario/tax"
import { deductionFlags } from "../../scenario/tax/deduction-flags"
import { writtenScenario } from "../../scenario/view"
import { assumptionsField } from "../../tax-assumptions"

export const tax: Leaf = defineCommand({
	name: "tax",
	summary: "Write or remove the tax Levy a Scenario's labelled Flows are taxed under",
	description:
		"With --filing-status married_joint and a household that has a partner and Owners (traj scenario household), the Levy is one over both people as Filers: state each label bare, and the CLI adds the Owner's suffix (income.section40_1@me, or @shared for income of both), so each spouse has their own expense ceiling. Without a partner or Owners every status writes the bare labels it always wrote. The household is read each time the tax is written: after changing its owners, run --from-stored.",
	note: "The stored tax profile ships in 0.8.0, and so do --merge, --from-stored and --if-hash.",
	positionals: ["scenario"],
	input: z.strictObject({
		scenario: z.string().min(1).describe("The Scenario's exact name or its id."),
		tax: z
			.enum(["th-2026"])
			.optional()
			.describe("Write the tax Levy for this jurisdiction: Thailand's 2026 income tax."),
		filingStatus: z
			.enum(FILING_STATUSES)
			.optional()
			.describe("The taxpayer's filing status; needs --tax and defaults to `single`."),
		children: z
			.number()
			.int()
			.min(0)
			.optional()
			.describe("Children counted for the child allowance; needs --tax and defaults to 0."),
		childrenAtHigherRate: z
			.number()
			.int()
			.min(0)
			.optional()
			.describe(
				"Children born 2018 or later, allowed at the higher rate; a subset of --children and needs --tax.",
			),
		...deductionFlags,
		label: z.array(z.string()).optional().describe(labelFlagDescription()),
		...MODE_FLAGS,
		dryRun: z.boolean().optional().describe("Report the row and roll the write back."),
		ifHash: IF_HASH,
	}),
	output: z.strictObject({
		dryRun: z.boolean().describe("True when the write was rolled back."),
		status: z
			.enum(["created", "updated", "unchanged"])
			.describe(
				"Whether the document or the stored profile changed; `created` is never returned here.",
			),
		levy: z
			.string()
			.optional()
			.describe("The Levy id the write states; absent when --none wrote no Levy."),
		filers: z
			.array(z.string())
			.optional()
			.describe(
				"The Filers of the joint Return the Levy is written over, holder first, each a household person who has income; absent when the plan keeps bare labels, because its household has no partner or no Owners, or its filing status is not married_joint.",
			),
		allowances: z
			.strictObject({
				stated: z
					.array(z.enum(TAX_ALLOWANCE_CLASSES))
					.describe("The deduction classes the flags stated."),
				notStated: z
					.array(z.enum(TAX_ALLOWANCE_CLASSES))
					.describe(
						"The deduction classes this build supports but the flags left out, so the figure leaves them out.",
					),
			})
			.optional()
			.describe(
				"The deduction classes the write stated; absent when --none wrote no Levy. It says what the flags said, not what tax-core applied.",
			),
		assumptions: assumptionsField
			.optional()
			.describe(
				"The tax figures the stored Levy would use whose source is not yet confirmed, for the labels the Scenario's Flows carry; absent when --none wrote no Levy. A Projection's `taxYears` say which year used which.",
			),
		scenario: writtenScenario,
	}),
	examples: taxExamples,
	errorCodes: ["database_busy", "invalid_input", "not_found", "scenario_changed"],
	run: (input, ctx) => writeTax(input, ctx),
})
