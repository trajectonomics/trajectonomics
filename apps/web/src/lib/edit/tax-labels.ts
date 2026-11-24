/**
 * The tax labels a whole tax write may carry, as `traj scenario tax --label <flow>=<label>` takes them
 * ([web ADR 0016](../../../docs/adr/0016-the-tax-profile-page-changes-one-item-through-scenario-tax-merge.md)). `--label` needs
 * `--tax`, because the Levy reads the labels, so a plan with no Levy is labelled in the write that gives it one. Only the income
 * labels are offered: the form labels income Flows. `scripts/tax-cards.test.ts` pins the list against `traj`'s own. Pure.
 */
import { z } from "zod"

/** The income labels `scenario tax --label` takes for an income Flow, in the CLI's order. */
export const INCOME_LABEL_IDS = [
	"income.section40_1",
	"income.section40_2",
	"income.section40_3",
	"income.section40_4",
	"income.section40_4.interest",
	"income.section40_4.dividends",
	"income.section40_4.digitalAssets",
	"income.section40_5.building",
	"income.section40_5.agriculturalLand",
	"income.section40_5.nonAgriculturalLand",
	"income.section40_5.vehicles",
	"income.section40_5.other",
	"income.section40_6.medical",
	"income.section40_6.law",
	"income.section40_6.engineering",
	"income.section40_6.architecture",
	"income.section40_6.accounting",
	"income.section40_6.fineArts",
	"income.section40_6.other",
	"income.section40_7",
	"income.section40_8.general",
	"income.section40_8.entertainer",
] as const

/**
 * A Flow's id as a label can name it: any id the page itself makes (Thai script and punctuation included) except one with a `=`,
 * because `traj` splits a label on the first `=`, or a control character. The argv carries the label as one token
 * (`--label=<flow>=<label>`), so an id that starts with `-` never reads as a flag.
 */
export const FLOW_ID = /^[^=\p{Cc}]+$/u

/** The labels of one whole write: each names an income Flow and a label. */
export const taxLabels = z
	.array(
		z.strictObject({
			flow: z.string().min(1).max(256).regex(FLOW_ID),
			label: z.enum(INCOME_LABEL_IDS),
		}),
	)
	.max(200)

/** The labels of an Edit. */
export type TaxLabels = z.infer<typeof taxLabels>

/** The argv tokens of the labels: one `--label=<flow>=<label>` each, a single token. */
export function labelTokens(labels: TaxLabels): string[] {
	return labels.map((one) => `--label=${one.flow}=${one.label}`)
}
