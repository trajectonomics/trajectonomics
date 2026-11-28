import type { QuotaRow, QuotaWindow } from "../types"
import { asObject, type JsonObject } from "./credentials"

function resetsAtIso(value: unknown): string | null | undefined {
	if (value === null || value === undefined) return null
	if (typeof value !== "string") return undefined
	const ms = Date.parse(value)
	return Number.isNaN(ms) ? undefined : new Date(ms).toISOString()
}

function collectGroupBuckets(groups: readonly unknown[]): unknown[] | null {
	const buckets: unknown[] = []
	for (const group of groups) {
		const groupObj = asObject(group)
		if (groupObj === null) return null
		const list = groupObj["buckets"]
		if (list === undefined) continue
		if (!Array.isArray(list)) return null
		buckets.push(...list)
	}
	return buckets
}

function collectAntigravityBuckets(record: JsonObject): unknown[] | null {
	if (Array.isArray(record["groups"])) return collectGroupBuckets(record["groups"])
	return Array.isArray(record["buckets"]) ? record["buckets"] : null
}

function antigravityWindow(bucketId: string, window: unknown): QuotaWindow | null {
	if (!bucketId.startsWith("gemini-")) return null
	if (window === "5h" || bucketId === "gemini-5h") return "five_hour"
	if (window === "weekly" || bucketId === "gemini-weekly") return "weekly"
	return null
}

function remainingFraction(value: unknown): number | null {
	// Protobuf JSON omits default 0 values, so an absent remainingFraction means exhausted (0).
	if (value === undefined) return 0
	if (typeof value !== "number" || !Number.isFinite(value)) return null
	return value >= 0 && value <= 1 ? value : null
}

function parseBucket(raw: unknown, sampledAt: string): QuotaRow | null | undefined {
	const bucket = asObject(raw)
	if (bucket === null) return undefined
	if (bucket["disabled"] === true) return null
	const bucketId = bucket["bucketId"]
	if (typeof bucketId !== "string") return null
	const win = antigravityWindow(bucketId, bucket["window"])
	if (win === null) return null
	const remaining = remainingFraction(bucket["remainingFraction"])
	if (remaining === null) return undefined
	const resets = resetsAtIso(bucket["resetTime"])
	if (resets === undefined) return undefined
	return {
		contributor: "trajectonomics",
		plan: "antigravity",
		window: win,
		sampledAt,
		usedPct: Math.round((1 - remaining) * 1_000_000) / 10_000,
		resetsAt: resets,
	}
}

function recordHighest(byWindow: Map<QuotaWindow, QuotaRow>, row: QuotaRow): void {
	const existing = byWindow.get(row.window)
	if (!existing || row.usedPct > existing.usedPct) byWindow.set(row.window, row)
}

/** Parses Antigravity's `retrieveUserQuotaSummary` body into Gemini quota rows. */
export function parseAntigravityQuota(body: unknown, sampledAt: string): QuotaRow[] | null {
	const record = asObject(body)
	const buckets = record === null ? null : collectAntigravityBuckets(record)
	if (buckets === null) return null
	const byWindow = new Map<QuotaWindow, QuotaRow>()
	for (const raw of buckets) {
		const row = parseBucket(raw, sampledAt)
		if (row === undefined) return null
		if (row !== null) recordHighest(byWindow, row)
	}
	return byWindow.size > 0 ? [...byWindow.values()] : null
}
