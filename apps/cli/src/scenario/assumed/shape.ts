import { z } from "zod"

/**
 * The kinds of Assumed value this build publishes, in the order `assumedOf` lists them (cli ADR-0083,
 * ADR-0084). `run-rate` waits for #687, which adds a `history` source to the same column.
 */
export const ASSUMED_KINDS = [
	"template-default",
	"unlabelled-income",
	"unstated-allowance",
	"tax-figure",
] as const

/** A value `traj` wrote into the document that no edit has touched since (cli ADR-0084). */
export type TemplateDefault = {
	kind: "template-default"
	path: string
	value: number | string
	hint: string
}

/** An income Flow with no string `label`, in a plan that holds a Levy. */
export type UnlabelledIncome = {
	kind: "unlabelled-income"
	path: string
	value: null
	hint: string
}

/** A deduction class this build supports that the plan leaves out (cli ADR-0073). */
export type UnstatedAllowance = {
	kind: "unstated-allowance"
	path: string
	value: null
	hint: string
}

/** A tax figure the stored Levy uses whose source is not yet confirmed (cli ADR-0042). */
export type TaxFigure = {
	kind: "tax-figure"
	path: string
	value: number | number[]
	status: "reported" | "unsourced"
	note: string
	hint: null
}

/** One value a plan assumes that nobody stated, told apart by its `kind`. */
export type AssumedItem = TemplateDefault | UnlabelledIncome | UnstatedAllowance | TaxFigure

const templateDefault = z.strictObject({
	kind: z
		.literal("template-default")
		.describe(
			"A value `traj` wrote into the document that no edit has touched since (cli ADR-0084).",
		),
	path: z
		.string()
		.describe(
			"`economy.inflation`, `accounts.<id>.rate` or `flows.<id>.amount`, in the Override grammar.",
		),
	value: z
		.union([z.number(), z.string()])
		.describe(
			"The value as `scenario show` prints it: an amount is a decimal string under `--decimal`, while inflation and rates stay integer basis points.",
		),
	hint: z.string().describe("The command that states the value, at this one or another."),
})

const unlabelledIncome = z.strictObject({
	kind: z
		.literal("unlabelled-income")
		.describe("An income Flow with no string `label`, in a plan that holds a Levy (cli ADR-0083)."),
	path: z.string().describe("The Flow's label path in the Override grammar: `flows.<id>.label`."),
	value: z.null().describe("Null: a label is missing, not a figure."),
	hint: z.string().describe("The command that states a Section 40 label for the Flow."),
})

const unstatedAllowance = z.strictObject({
	kind: z
		.literal("unstated-allowance")
		.describe(
			"A deduction class this build supports that the plan leaves out (cli ADR-0073, ADR-0083).",
		),
	path: z.string().describe("The class's path in the Override grammar: `taxAllowances.<class>`."),
	value: z.null().describe("Null: the allowance is missing, not a figure."),
	hint: z.string().describe("The command that states the allowance class."),
})

const taxFigure = z.strictObject({
	kind: z
		.literal("tax-figure")
		.describe(
			"A tax figure the stored Levy uses whose source is not yet confirmed (cli ADR-0042, ADR-0083).",
		),
	path: z.string().describe("The figure's path in the tax core's parameters for the year."),
	value: z
		.union([z.number(), z.array(z.number())])
		.describe("The value the computation used, in the unit the note names; a table is a list."),
	status: z
		.enum(["reported", "unsourced"])
		.describe(
			"`reported`: only a secondary source states it. `unsourced`: no source was read, so it is an assumption.",
		),
	note: z.string().describe("What the figure is, in one short sentence."),
	hint: z.null().describe("Null: a tax figure is cleared by sourcing it, not by a command here."),
})

/** One Assumed value, a discriminated union on `kind` (cli ADR-0083). */
export const assumedItem: z.ZodType<AssumedItem> = z.discriminatedUnion("kind", [
	templateDefault,
	unlabelledIncome,
	unstatedAllowance,
	taxFigure,
])

/** The values a plan assumes that nobody stated; empty when it assumes none. */
export const assumedField: z.ZodType<AssumedItem[]> = z
	.array(assumedItem)
	.describe(
		"The values this plan assumes that nobody stated, in the fixed kind order; empty when there are none (cli ADR-0083, ADR-0084). `run-rate` waits for #687.",
	)
