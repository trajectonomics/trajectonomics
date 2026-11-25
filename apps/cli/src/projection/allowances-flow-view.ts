import { z } from "zod"
import { dateField, moneyField } from "./money"

/**
 * The contribution a person would add to apply one suggestion, as a Flow in the Scenario's decimal
 * form (cli ADR-0047), so `scenario apply --decimal` takes it as it is. `target` is absent when no
 * contribution of the plan carries the label (cli ADR-0061).
 */
export type AllowanceFlow = {
	id: string
	kind: "contribution"
	funding: "obligation"
	frequency: "once"
	label: string
	amount: string
	growth: { bps: 0 }
	start: string
	target?: string | undefined
}

export const allowanceFlow: z.ZodType<AllowanceFlow> = z.strictObject({
	id: z
		.string()
		.describe(
			"`<target>-<label suffix>-<year>`: the Account, the label's last dot-separated part with `_` as `-`, and the tax year's last year. Without a target the id has no first part. A `-2`, `-3`, ... follows when the plan or an earlier suggestion already uses the id. The Dashboard reads it as a convention (cli ADR-0061).",
		),
	kind: z.literal("contribution").describe("Always a contribution."),
	funding: z
		.literal("obligation")
		.describe("Always an obligation: paid in full, from savings when the day's cash is short."),
	frequency: z.literal("once").describe("Always once."),
	label: z.string().describe("The contribution Tally label the Levy reads."),
	amount: moneyField("The extra to contribute, in the Scenario's decimal form (major units)"),
	growth: z
		.strictObject({ bps: z.literal(0) })
		.describe("Always no growth, which the document requires beside an amount."),
	start: dateField(
		"The date it lands: the 15th of the tax year's last month, or the As-of when that is later",
	),
	target: z
		.string()
		.optional()
		.describe(
			"The Account the plan's first contribution with this label pays into, in Scenario order. Absent when none does: the row's hint says to add the Account first.",
		),
})
