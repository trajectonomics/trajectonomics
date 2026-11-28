import type { QuotaRow } from "../types"
import { asObject } from "./credentials"

export { parseAntigravityQuota } from "./parse-antigravity"

function clampedPct(value: unknown, allowAbsentZero = false): number | null {
	if (allowAbsentZero && value === undefined) return 0
	if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null
	return Math.min(100, value)
}

function resetsAtEpochMs(value: unknown): string | null | undefined {
	if (value === null || value === undefined) return null
	const num = typeof value === "string" && value.trim().length > 0 ? Number(value) : value
	if (typeof num !== "number" || !Number.isFinite(num) || num <= 0) return undefined
	const date = new Date(num)
	return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

/** Parses Cursor's `GetCurrentPeriodUsage` body into a monthly quota row. */
export function parseCursorQuota(body: unknown, sampledAt: string): QuotaRow[] | null {
	const record = asObject(body)
	if (record === null) return null
	const planUsage = asObject(record["planUsage"])
	if (planUsage === null) return null
	// Proto3 JSON omits 0 at the start of a billing cycle, and overage/bonus may exceed 100%.
	const pct = clampedPct(planUsage["totalPercentUsed"], true)
	const resets = resetsAtEpochMs(record["billingCycleEnd"])
	if (pct === null || resets === undefined) return null
	return [
		{
			contributor: "trajectonomics",
			plan: "cursor",
			window: "monthly",
			sampledAt,
			usedPct: pct,
			resetsAt: resets,
		},
	]
}

const MUSE_WINDOWS = [
	["window", "five_hour"],
	["weekly", "weekly"],
] as const

/** Whether Muse reports that nothing has been used in its current window yet. */
export function isMuseNoUsage(body: unknown): boolean {
	const record = asObject(body)
	return record?.["allowance"] === null && record["reason"] === "server_sent_no_usage"
}

/** Parses `muse usage --json` output into five-hour and weekly quota rows for `meta`. */
export function parseMuseQuota(body: unknown, sampledAt: string): QuotaRow[] | null {
	const allowance = asObject(asObject(body)?.["allowance"])
	if (allowance === null) return null
	const rows: QuotaRow[] = []
	for (const [key, win] of MUSE_WINDOWS) {
		const raw = allowance[key]
		if (raw === null) continue
		const entry = asObject(raw)
		if (entry === null) return null
		const pct = clampedPct(entry["usedPercent"])
		const resets = resetsAtEpochMs(entry["resetsAtMs"])
		if (pct === null || resets === undefined) return null
		rows.push({
			contributor: "trajectonomics",
			plan: "meta",
			window: win,
			sampledAt,
			usedPct: pct,
			resetsAt: resets,
		})
	}
	return rows
}
