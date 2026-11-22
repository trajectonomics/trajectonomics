import type { ThAssumption } from "@trajectonomics/core/tax/th"
import { z } from "zod"

/** The key every result carries its assumptions under, so the human Format can find them. */
export const ASSUMPTIONS_KEY: string = "assumptions"

/**
 * One tax figure a result used whose source is not yet confirmed (ADR-0042). It is
 * `@trajectonomics/core/tax`'s own record: the CLI adds no figure and judges none.
 */
export type AssumptionView = {
	path: string
	value: number | number[]
	status: "reported" | "unsourced"
	note: string
}

export const assumptionView: z.ZodType<AssumptionView> = z.strictObject({
	path: z.string().describe("The figure's path in the tax core's parameters for the year."),
	value: z
		.union([z.number(), z.array(z.number())])
		.describe(
			"The value the computation used, in the unit the note names: baht, a ratio, days or years. A statutory table is a list, one entry per row.",
		),
	status: z
		.enum(["reported", "unsourced"])
		.describe(
			"`reported`: only a secondary source states the figure. `unsourced`: no source was read, so the figure is an assumption.",
		),
	note: z.string().describe("What the figure is, in one short sentence."),
})

/** The list a result carries; empty when every figure the computation used is confirmed. */
export const assumptionsField: z.ZodType<AssumptionView[]> = z
	.array(assumptionView)
	.describe(
		"The tax figures this result used whose source is not yet confirmed, named until they are sourced. Empty when every figure used is confirmed.",
	)

/** The core's assumptions as the CLI states them; the values are the core's, not recomputed. */
export function assumptionViews(found: readonly ThAssumption[]): AssumptionView[] {
	return found.map((it) => ({
		path: it.path,
		value: typeof it.value === "number" ? it.value : [...it.value],
		status: it.status,
		note: it.note,
	}))
}
