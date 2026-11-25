import type { core, z } from "zod"
import { custom } from "./issue"
import {
	boundaryMs,
	isBeforeIngestFloor,
	isKnownPlan,
	isMachineAlias,
	isMoreThanOneHourAhead,
	MAX_TOKENS,
} from "./rules"
import type { usage } from "./schema-usage"
import type { Principal } from "./types"

export type UsageShape = z.infer<typeof usage>

function checkToken(ctx: core.$RefinementCtx, path: string[], value: number | null): boolean {
	if (value === null) return true
	if (!Number.isInteger(value)) {
		custom(ctx, path, "TOKEN_NOT_INTEGER", "Token counts must be integers.")
		return false
	}
	if (value < 0) {
		custom(ctx, path, "TOKEN_NEGATIVE", "Token counts must not be negative.")
		return false
	}
	if (value > MAX_TOKENS) {
		custom(ctx, path, "TOKEN_TOO_LARGE", `Token counts must not exceed ${MAX_TOKENS}.`)
		return false
	}
	return true
}

function checkTokenFields(row: UsageShape, ctx: core.$RefinementCtx): void {
	const inOk = checkToken(ctx, ["tokensIn"], row.tokensIn)
	const outOk = checkToken(ctx, ["tokensOut"], row.tokensOut)
	const readOk = checkToken(ctx, ["cacheRead"], row.cacheRead)
	const writeOk = checkToken(ctx, ["cacheWrite"], row.cacheWrite)
	const totalOk = checkToken(ctx, ["tokensTotal"], row.tokensTotal)
	if (!inOk || !outOk || !readOk || !writeOk || !totalOk) return
	const parts = [row.tokensIn, row.tokensOut, row.cacheRead, row.cacheWrite]
	const present = parts.filter((part): part is number => part !== null)
	const sum = present.reduce((total, part) => total + part, 0)
	if (row.tokensTotal < sum || (present.length === parts.length && row.tokensTotal !== sum)) {
		custom(
			ctx,
			["tokensTotal"],
			"TOKENS_TOTAL_INCONSISTENT",
			"tokensTotal must be at least the sum of its parts, and equal to it when all are present.",
		)
	}
}

function checkBoundary(
	ctx: core.$RefinementCtx,
	value: string,
	granularity: "hour" | "day",
	nowMs: number,
): void {
	const ms = boundaryMs(value, granularity)
	if (ms === null) {
		custom(
			ctx,
			["hourUtc"],
			"HOUR_NOT_ON_BOUNDARY",
			granularity === "day" ? "hourUtc must start a UTC day." : "hourUtc must start a UTC hour.",
		)
		return
	}
	if (isBeforeIngestFloor(ms)) {
		custom(ctx, ["hourUtc"], "HOUR_TOO_OLD", "hourUtc must be at or after 2020-01-01T00:00:00Z.")
		return
	}
	if (isMoreThanOneHourAhead(ms, nowMs)) {
		custom(ctx, ["hourUtc"], "HOUR_IN_FUTURE", "hourUtc must not be more than one hour ahead.")
	}
}

/** Applies the usage-row rules; each failure carries its own domain code. */
export function checkUsage(
	row: UsageShape,
	ctx: core.$RefinementCtx,
	principal: Principal,
	nowMs: number,
): void {
	if (row.contributor !== principal.contributorId) {
		custom(ctx, ["contributor"], "CONTRIBUTOR_MISMATCH", "The row names a different contributor.")
	}
	if (!isKnownPlan(row.plan)) custom(ctx, ["plan"], "PLAN_UNKNOWN", "Unknown plan id.")
	if (!isMachineAlias(row.machine)) {
		custom(ctx, ["machine"], "MACHINE_ALIAS_INVALID", "machine must be m- followed by 8 hex chars.")
	}
	checkBoundary(ctx, row.hourUtc, row.granularity, nowMs)
	checkTokenFields(row, ctx)
	if (!Number.isInteger(row.requests) || row.requests < 0 || row.requests > MAX_TOKENS) {
		custom(
			ctx,
			["requests"],
			"REQUESTS_INVALID",
			"requests must be a non-negative integer within bounds.",
		)
	}
}
