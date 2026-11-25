import type { UsageRow } from "@trajectonomics/data-collector/types"
import type { core } from "zod"
import { z } from "zod"
import { isoTimestamp } from "./iso"
import type { Principal } from "./types"
import type { UsageShape } from "./usage-rules"
import { checkUsage } from "./usage-rules"

export const usage = z.strictObject({
	contributor: z.string(),
	machine: z.string(),
	plan: z.string(),
	model: z.string().min(1),
	hourUtc: isoTimestamp,
	granularity: z.enum(["hour", "day"]),
	tokensIn: z.number().nullable(),
	tokensOut: z.number().nullable(),
	cacheRead: z.number().nullable(),
	cacheWrite: z.number().nullable(),
	tokensTotal: z.number(),
	requests: z.number(),
	source: z.string().min(1),
	bestEffort: z.boolean(),
})

/** Builds the usage-row schema bound to one contributor and the request's clock. */
export function usageSchema(principal: Principal, nowMs: number) {
	return usage.superRefine((row: UsageShape, ctx: core.$RefinementCtx) =>
		checkUsage(row, ctx, principal, nowMs),
	)
}

/** Returns the row with the authenticated contributor, never the one in the body. */
export function toUsageRow(row: UsageShape, contributor: UsageRow["contributor"]): UsageRow {
	return {
		contributor,
		machine: row.machine,
		plan: row.plan,
		model: row.model,
		hourUtc: row.hourUtc,
		granularity: row.granularity,
		tokensIn: row.tokensIn,
		tokensOut: row.tokensOut,
		cacheRead: row.cacheRead,
		cacheWrite: row.cacheWrite,
		tokensTotal: row.tokensTotal,
		requests: row.requests,
		source: row.source,
		bestEffort: row.bestEffort,
	}
}
