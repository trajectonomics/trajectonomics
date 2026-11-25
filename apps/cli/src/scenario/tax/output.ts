import { z } from "zod"
import { type AssumptionView, assumptionsField } from "../../tax-assumptions"
import { type WrittenScenario, writtenScenario } from "../view"
import type { TaxProfileView } from "./profile"
import { TAX_ALLOWANCE_CLASSES } from "./profile"

/** What `traj scenario tax` prints: the write's result, its Levy ids and the profile classes. */
export type TaxOutputView = {
	dryRun: boolean
	status: "created" | "updated" | "unchanged"
	levy?: string | undefined
	levies?: string[] | undefined
	filers?: string[] | undefined
	allowances?: TaxProfileView | undefined
	assumptions?: AssumptionView[] | undefined
	unclaimed?: string[] | undefined
	scenario: WrittenScenario
}

/** The output schema of `traj scenario tax`, which `traj schema` publishes. */
export const taxOutput: z.ZodType<TaxOutputView> = z.strictObject({
	dryRun: z.boolean().describe("True when the write was rolled back."),
	status: z
		.enum(["created", "updated", "unchanged"])
		.describe(
			"Whether the document or the stored profile changed; `created` is never returned here.",
		),
	levy: z
		.string()
		.optional()
		.describe(
			"The Levy id the write states; absent when --none wrote no Levy, or when a separate Return wrote several.",
		),
	levies: z
		.array(z.string())
		.optional()
		.describe(
			"The Levy ids a separate Return wrote, one per Filer (cli ADR-0075); absent when the write wrote one Levy or none.",
		),
	filers: z
		.array(z.string())
		.optional()
		.describe(
			"The Filers of the Return the Levies are written for, holder first, each a household person who has income; absent when the plan keeps bare labels, because its household has no partner or no Owners, or its filing status is neither married_joint nor married_separate.",
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
			"The tax figures the stored Levies would use whose source is not yet confirmed, for the labels the Scenario's Flows carry; absent when --none wrote no Levy. A Projection's `taxYears` say which year used which. Where two separate Returns each state home-loan interest, both own a loan and no interest is stated as shared (--mortgage-interest shared=), the ceiling's note says each Return's interest is taken to be on separate loans.",
		),
	unclaimed: z
		.array(z.string())
		.optional()
		.describe(
			"Claims the stored profile keeps that no Return of this write claims, one sentence each; absent when there are none, and when --none wrote no Levy. A write that is not a separate filing with Filers names the shared home-loan interest and the other people's claims it keeps. A separate filing with Filers names each person with stored claims and no taxed income.",
		),
	scenario: writtenScenario,
})
