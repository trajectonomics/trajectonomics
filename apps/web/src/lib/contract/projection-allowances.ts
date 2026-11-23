import { z } from "zod"
import { dateString } from "./date"
import { integer } from "./integer"
import { money } from "./money"
import { projectionShape } from "./projection-shape"
import { assumption } from "./tax-year"

/** Why a label's steps stopped: the CLI's closed set, never a sentence (cli ADR-0061). */
export const stoppedBy = z.enum(["noSaving", "belowMinSaving", "budget"])

/**
 * The contribution that applies one suggestion, as a Flow in the Scenario's decimal form (cli ADR-0047,
 * ADR-0061). `target` is absent when no contribution of the plan carries the label.
 */
export const allowanceFlow = z.strictObject({
	id: z.string(),
	kind: z.literal("contribution"),
	funding: z.literal("obligation"),
	frequency: z.literal("once"),
	label: z.string(),
	amount: money,
	growth: z.strictObject({ bps: z.literal(0) }),
	start: dateString,
	target: z.string().optional(),
})
export type AllowanceFlow = z.infer<typeof allowanceFlow>

/** One whole tax year: the tax it owes now and with every suggestion, and the saving. */
export const allowanceYear = z.strictObject({
	levy: z.string(),
	from: dateString,
	to: dateString,
	settlementDate: dateString,
	dueBefore: money,
	dueAfter: money,
	saving: money,
	assumptions: z.array(assumption),
})
export type AllowanceYear = z.infer<typeof allowanceYear>

/** One tax year and label: what is planned, what more fits, why it stopped, and the Flow that applies it. */
export const allowanceRow = z.strictObject({
	levy: z.string(),
	from: dateString,
	to: dateString,
	label: z.string(),
	planned: money,
	extra: money,
	saving: money,
	stoppedBy,
	flow: allowanceFlow.optional(),
	hint: z.string().optional(),
})
export type AllowanceRow = z.infer<typeof allowanceRow>

/** `traj projection allowances --json`: how much more each tax allowance could take, and the tax it saves. */
export const projectionAllowances = z.strictObject({
	...projectionShape,
	labels: z.array(z.string()),
	step: money,
	budget: money.optional(),
	minSavingBps: integer.optional(),
	taxYears: z.array(allowanceYear),
	allowances: z.array(allowanceRow),
})
export type ProjectionAllowances = z.infer<typeof projectionAllowances>
