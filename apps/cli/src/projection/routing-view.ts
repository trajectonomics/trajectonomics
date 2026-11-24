import { z } from "zod"

/*
 * The shape of `projection run`'s `routing` echo (cli ADR-0070): the routing as the document states it, step
 * by step, present only when the document uses a share, a Reserve floor or a target that keeps its value.
 * Every figure is a number the document wrote; the engine's own resolution of a grown target is not in it.
 */

/** A growth as the document states it: `"inflation"` or `{ bps }`. */
export type RoutedGrowthView = "inflation" | { bps: number }

/**
 * A routing target: the amount the document wrote, as a decimal string at the Currency's scale. `growth` is
 * `null` for a nominal figure, and the document's own growth when the target keeps its value in today's money.
 */
export type RoutedTargetView = { amount: string; growth: RoutedGrowthView | null }

/** One surplus step, by its position in `cashflow.surplus`. */
export type SurplusEntryView = {
	entry: number
	account: string
	upTo: RoutedTargetView | null
	share: string | null
}

/** One withdrawal entry, by its position in `cashflow.withdraw`. */
export type WithdrawEntryView = {
	entry: number
	account: string
	downTo: RoutedTargetView | null
}

export type RoutingView = { surplus: SurplusEntryView[]; withdraw: WithdrawEntryView[] }

const growth: z.ZodType<RoutedGrowthView> = z.union([
	z.literal("inflation"),
	z.strictObject({
		bps: z.number().int().describe("Basis points per year; negative steps it down."),
	}),
])

const target: z.ZodType<RoutedTargetView> = z.strictObject({
	amount: z
		.string()
		.describe(
			"The amount the document wrote, as a decimal string at the currency's own scale. With a growth it is the amount at the start of the Timeline, not the amount in force on a later date.",
		),
	growth: growth
		.nullable()
		.describe(
			'null for a nominal figure, which stays what it says; "inflation" or { bps } when the target is grown by whole years from the start of the Timeline, so it keeps its value in today\'s money.',
		),
})

const surplusEntry: z.ZodType<SurplusEntryView> = z.strictObject({
	entry: z.number().int().describe("The step's position in cashflow.surplus, counted from 0."),
	account: z.string().describe("The Account the step fills, as the Scenario spells its id."),
	upTo: target
		.nullable()
		.describe("The balance the step fills the Account to; null when it has no cap."),
	share: z
		.string()
		.nullable()
		.describe(
			'The percent of the money still unrouted the step takes, as a string with two places ("30.00" is 30%); null when the step takes everything it can.',
		),
})

const withdrawEntry: z.ZodType<WithdrawEntryView> = z.strictObject({
	entry: z.number().int().describe("The entry's position in cashflow.withdraw, counted from 0."),
	account: z.string().describe("The Account the entry draws, as the Scenario spells its id."),
	downTo: target
		.nullable()
		.describe(
			"The Reserve floor the entry draws the Account down to; null when it draws it to nothing.",
		),
})

export const routingView: z.ZodType<RoutingView> = z.strictObject({
	surplus: z
		.array(surplusEntry)
		.describe("The surplus steps in the order the engine routes them, each by its position."),
	withdraw: z
		.array(withdrawEntry)
		.describe(
			"The withdrawal entries in the order the engine draws them, each by its position; an Account may appear twice with a lower floor. The positions are the entry numbers a drawn cash-flow line carries.",
		),
})

export const routingField: z.ZodType<RoutingView | undefined> = routingView
	.optional()
	.describe(
		"The routing the document states, present only when it uses a share, a Reserve floor or a target that keeps its value in today's money; absent for a plain routing. It states the figures the document wrote: a grown target's amount in force on a date is not stated here.",
	)
