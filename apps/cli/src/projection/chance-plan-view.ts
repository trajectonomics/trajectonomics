import { z } from "zod"

/** The inputs of a plan model, echoed so a reader sees what the paths were built from. */
export type PlanModelView = {
	source: "plan"
	buckets: number
	accounts: { id: string; rate: number; volatility: number }[]
	/** The Scenario's inflation spread, present only when `economy.inflationVolatility` is above 0. */
	inflation?: { rate: number; volatility: number } | undefined
}

/** `returnModel` in the result: present only with `--return-model plan` (cli ADR-0068). */
export const planModelField: z.ZodOptional<z.ZodType<PlanModelView>> = z
	.strictObject({
		source: z.literal("plan").describe("Always `plan`: the model was built from the Scenario."),
		buckets: z.number().int().describe("The number of buckets the model was built with."),
		accounts: z
			.array(
				z.strictObject({
					id: z.string().describe("The Account's id."),
					rate: z
						.number()
						.int()
						.describe("Its yearly rate in basis points, as the Scenario states it."),
					volatility: z
						.number()
						.int()
						.describe("The standard deviation of its yearly return in basis points."),
				}),
			)
			.describe(
				"The Accounts that swing, in the Scenario's order; every other Account keeps its rate.",
			),
		inflation: z
			.strictObject({
				rate: z
					.number()
					.int()
					.describe("The Scenario's yearly inflation in basis points: the factor's mean."),
				volatility: z
					.number()
					.int()
					.describe("The standard deviation of one year's inflation in basis points."),
			})
			.optional()
			.describe(
				"Present only when the Scenario states an `inflationVolatility` above 0: the inflation factor the paths draw.",
			),
	})
	.optional()
	.describe("Present only with `--return-model plan`: what the model was built from.")
