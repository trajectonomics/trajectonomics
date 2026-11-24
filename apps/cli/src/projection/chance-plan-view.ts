import { z } from "zod"

/** The inputs of a plan model, echoed so a reader sees what the paths were built from. */
export type PlanModelView = {
	source: "plan"
	buckets: number
	accounts: { id: string; rate: number; volatility: number }[]
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
	})
	.optional()
	.describe("Present only with `--return-model plan`: what the model was built from.")
