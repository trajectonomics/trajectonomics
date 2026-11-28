import { z } from "zod"
import { type PlanModelView, planModelField } from "./chance-plan-view"
import { type ChanceDefinitionView, chanceDefinition } from "./chance-view"
import { dateField } from "./money"
import { type ProjectionRunView, projectionRunFields } from "./run-view"

/*
 * `traj projection path` (cli ADR-0069): the Projection of one seeded Market path, in `projection run`'s
 * shape, plus the returns the path drew and the run that names it.
 */

/** One Account's compounded return over one Annual roll-up, in basis points. */
export type PathAccountReturnView = { account: string; returnBps: number }

/** Every Account's return over one Annual roll-up of the path. */
export type PathRollupReturnsView = {
	index: number
	from: string
	to: string
	/** The path's own inflation over the roll-up, in basis points; present only with an inflation factor (cli ADR-0085). */
	inflationBps?: number | undefined
	accounts: PathAccountReturnView[]
}

/** `traj projection path`: the Projection of path `index`, the returns it drew, and the run it is a path of. */
export type ProjectionPathView = ProjectionRunView & {
	/** The path's 0-based position in the run under `seed`. */
	index: number
	/** The run the path belongs to, as `projection chance` states it: `index` is below `definition.paths`. */
	definition: ChanceDefinitionView
	/** Present only for `--return-model plan`: the inputs the model was built from (cli ADR-0068). */
	returnModel?: PlanModelView | undefined
	returns: PathRollupReturnsView[]
}

const accountReturn: z.ZodType<PathAccountReturnView> = z.strictObject({
	account: z.string().describe("The Account's id."),
	returnBps: z
		.number()
		.int()
		.describe(
			"The market's compounded growth of this Account over the roll-up in basis points, rounded half away from zero: 1268 is 12.68%.",
		),
})

const rollupReturns: z.ZodType<PathRollupReturnsView> = z.strictObject({
	index: z.number().int().describe("The roll-up's index, from 0, as in the annual table."),
	from: dateField("The roll-up's first day"),
	to: dateField("The roll-up's last day"),
	inflationBps: z
		.number()
		.int()
		.optional()
		.describe(
			"The path's own inflation over the roll-up in basis points, rounded half away from zero; present only when the Return model has an inflation factor (cli ADR-0085).",
		),
	accounts: z.array(accountReturn).describe("One return per Account of the Return model."),
})

export const projectionPathView: z.ZodType<ProjectionPathView> = z.strictObject({
	...projectionRunFields,
	index: z
		.number()
		.int()
		.describe(
			"The path's 0-based position in the run under the seed, from 0 to definition.paths - 1.",
		),
	definition: chanceDefinition.describe(
		"The run this path belongs to, exactly as `projection chance` states it: the Return model's id (the file's, or plan-<buckets>), the seed and the path count.",
	),
	returnModel: planModelField,
	returns: z
		.array(rollupReturns)
		.describe(
			"One entry per Annual roll-up, in order: each Account's market return over the roll-up, from its first day through its last. It is the market's growth, so it need not equal the change in an Account's balance (contributions and withdrawals are not in it), and it covers one day more than the roll-up's closing net worth, which is read before that day's growth (sim ADR-0011).",
		),
})
