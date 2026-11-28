import { z } from "zod"

/**
 * The kinds of Assumed value a `scenario show` states (cli ADR-0083, ADR-0084), the closed list the
 * page branches on.
 */
export const ASSUMED_KINDS = [
	"template-default",
	"unlabelled-income",
	"unstated-allowance",
	"tax-figure",
] as const

export type AssumedKind = (typeof ASSUMED_KINDS)[number]

/** A value `traj` wrote into the document that no edit has touched since (cli ADR-0084). */
const templateDefault = z.strictObject({
	kind: z.literal("template-default"),
	path: z.string(),
	value: z.union([z.number(), z.string()]),
	hint: z.string(),
})

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
	templateDefault,
	unlabelledIncome,
	unstatedAllowance,
	taxFigure,
])
export type AssumedItem = z.infer<typeof assumedItem>
