import type { core } from "zod"
import { z } from "zod"
import { isoTimestamp } from "./iso"
import { custom } from "./issue"
import { boundaryMs, isKnownPlan, isMoreThanOneHourAhead } from "./rules"
import type { Principal, QuotaSample, QuotaWindow } from "./types"

const quota = z.strictObject({
	contributor: z.string(),
	plan: z.string(),
	window: z.string(),
	sampledAt: isoTimestamp,
	usedPct: z.number(),
	resetsAt: isoTimestamp.nullable(),
})

type QuotaShape = z.infer<typeof quota>

const WINDOWS = new Set<QuotaWindow>(["five_hour", "weekly", "monthly"])

function isQuotaWindow(value: string): value is QuotaWindow {
	return WINDOWS.has(value as QuotaWindow)
}

function checkQuota(
	row: QuotaShape,
	ctx: core.$RefinementCtx,
	principal: Principal,
	nowMs: number,
): void {
	if (row.contributor !== principal.contributorId) {
		custom(ctx, ["contributor"], "CONTRIBUTOR_MISMATCH", "The row names a different contributor.")
	}
	if (!isKnownPlan(row.plan)) custom(ctx, ["plan"], "PLAN_UNKNOWN", "Unknown plan id.")
	if (!isQuotaWindow(row.window)) {
		custom(ctx, ["window"], "QUOTA_WINDOW_UNKNOWN", "Unknown quota window.")
	}
	const ms = boundaryMs(row.sampledAt, "hour")
	if (ms === null) {
		custom(ctx, ["sampledAt"], "HOUR_NOT_ON_BOUNDARY", "sampledAt must start a UTC hour.")
	} else if (isMoreThanOneHourAhead(ms, nowMs)) {
		custom(ctx, ["sampledAt"], "HOUR_IN_FUTURE", "sampledAt must not be more than one hour ahead.")
	}
	if (!Number.isFinite(row.usedPct) || row.usedPct < 0 || row.usedPct > 100) {
		custom(ctx, ["usedPct"], "QUOTA_USED_PCT_RANGE", "usedPct must be between 0 and 100.")
	}
	if (row.resetsAt !== null && Number.isNaN(Date.parse(row.resetsAt))) {
		custom(ctx, ["resetsAt"], "RESETS_AT_INVALID", "resetsAt must be an ISO timestamp or null.")
	}
}

/** Builds the quota-sample schema bound to one contributor and the request's clock. */
export function quotaSchema(principal: Principal, nowMs: number) {
	return quota.superRefine((row: QuotaShape, ctx: core.$RefinementCtx) =>
		checkQuota(row, ctx, principal, nowMs),
	)
}

/** Returns the sample with the authenticated contributor, never the one in the body. */
export function toQuotaSample(
	row: QuotaShape,
	contributor: QuotaSample["contributor"],
): QuotaSample {
	return {
		contributor,
		plan: row.plan,
		window: row.window as QuotaWindow,
		sampledAt: row.sampledAt,
		usedPct: row.usedPct,
		resetsAt: row.resetsAt,
	}
}
