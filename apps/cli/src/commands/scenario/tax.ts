import { z } from "zod"
import type { Leaf } from "../../command"
import { defineCommand } from "../../command"
import { IF_HASH } from "../../scenario/if-hash"
import {
	FILING_STATUSES,
	labelFlagDescription,
	MODE_FLAGS,
	taxExamples,
	writeTax,
} from "../../scenario/tax"
import { deductionInputFlags } from "../../scenario/tax/deduction-flag-inputs"
import { taxShownBody, unclaimedBlocks } from "../../scenario/tax/human"
import { taxOutput } from "../../scenario/tax/output"

export const tax: Leaf = defineCommand({
	name: "tax",
	summary: "Write or remove the tax Levy a Scenario's labelled Flows are taxed under",
	description:
		"With --filing-status married_joint and a household that has a partner and Owners (traj scenario household), the Levy is one over both people as Filers: state each label bare, and the CLI adds the Owner's suffix (income.section40_1@me, or @shared for income of both), so each spouse has their own expense ceiling. With --filing-status married_separate the CLI writes one Levy per person who has income, and each allowance flag takes an optional person (--parents partner=2); a bare value names the holder, and each Return's children default to 0. State the interest on one loan borrowed together as --mortgage-interest shared=<amount>, which the two Returns split. Without a partner or Owners every status writes the bare labels it always wrote. The household is read each time the tax is written: after changing its owners, run --from-stored.",
	note: "The stored tax profile ships in 0.8.0, and so do --merge, --from-stored and --if-hash, and the separate Return.",
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
			.array(z.string())
			.optional()
			.describe(
				'Children counted for the child allowance; needs --tax and defaults to 0. Write "<person>=<count>" for one Return of a separate filing.',
			),
		childrenAtHigherRate: z
			.array(z.string())
			.optional()
			.describe(
				'Children born 2018 or later, allowed at the higher rate; a subset of --children and needs --tax. Write "<person>=<count>" for one Return of a separate filing.',
			),
		...deductionInputFlags,
		label: z.array(z.string()).optional().describe(labelFlagDescription()),
		...MODE_FLAGS,
		dryRun: z.boolean().optional().describe("Report the row and roll the write back."),
		ifHash: IF_HASH,
	}),
	output: taxOutput,
	render: { display: taxShownBody, blocks: unclaimedBlocks },
	examples: taxExamples,
	errorCodes: ["database_busy", "invalid_input", "not_found", "scenario_changed"],
	run: (input, ctx) => writeTax(input, ctx),
})
