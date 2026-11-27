import { z } from "zod"

/**
 * The kinds of Assumed value a `scenario show` states (cli ADR-0083), the closed list the page
 * branches on. `template-default` joins it with the stored column in cli ADR-0084.
 */
export const ASSUMED_KINDS = ["unlabelled-income", "unstated-allowance", "tax-figure"] as const

export type AssumedKind = (typeof ASSUMED_KINDS)[number]

/** An income Flow with no string `label`, in a plan that holds a Levy. */
const unlabelledIncome = z.strictObject({
	kind: z.literal("unlabelled-income"),
	path: z.string(),
	value: z.null(),
	hint: z.string(),
})

/** A deduction class this build supports that the plan leaves out (cli ADR-0073). */
const unstatedAllowance = z.strictObject({
	kind: z.literal("unstated-allowance"),
	path: z.string(),
	value: z.null(),
	hint: z.string(),
})

/** A tax figure the stored Levy uses whose source is not yet confirmed (cli ADR-0042). */
const taxFigure = z.strictObject({
	kind: z.literal("tax-figure"),
	path: z.string(),
	value: z.union([z.number(), z.array(z.number())]),
	status: z.enum(["reported", "unsourced"]),
	note: z.string(),
	hint: z.null(),
})

/** One value a plan assumes that nobody stated, told apart by its `kind` (cli ADR-0083). */
export const assumedItem = z.discriminatedUnion("kind", [
	unlabelledIncome,
	unstatedAllowance,
	taxFigure,
])
export type AssumedItem = z.infer<typeof assumedItem>
