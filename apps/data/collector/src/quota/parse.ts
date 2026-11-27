import type { QuotaPlan, QuotaRow, QuotaWindow } from "../types"

type JsonObject = Record<string, unknown>

/** The response fields that carry a window's percentage and reset time. */
type WindowFields = { percent: string; resets: string }

type WindowResult = QuotaRow | null | undefined

function asObject(value: unknown): JsonObject | null {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return null
	return value as JsonObject
}

function usedPct(value: unknown): number | null {
	if (typeof value !== "number" || !Number.isFinite(value)) return null
	return value >= 0 && value <= 100 ? value : null
}

/** Normalises a reset value to ISO; `undefined` means it was present but invalid. */
function resetsAt(value: unknown): string | null | undefined {
	if (value === null || value === undefined) return null
	if (typeof value !== "string") return undefined
	const ms = Date.parse(value)
	return Number.isNaN(ms) ? undefined : new Date(ms).toISOString()
}

function windowRow(
	plan: QuotaPlan,
	window: QuotaWindow,
	value: unknown,
	sampledAt: string,
	fields: WindowFields,
): WindowResult {
	if (value === null) return null
	const record = asObject(value)
	if (record === null) return undefined
	const pct = usedPct(record[fields.percent])
	const resets = resetsAt(record[fields.resets])
	if (pct === null || resets === undefined) return undefined
	return {
		contributor: "trajectonomics",
		plan,
		window,
		sampledAt,
		usedPct: pct,
		resetsAt: resets,
	}
}

function rowsFrom(
	plan: QuotaPlan,
	body: unknown,
	windows: readonly (readonly [string, QuotaWindow])[],
	fields: WindowFields,
	sampledAt: string,
): QuotaRow[] | null {
	const record = asObject(body)
	if (record === null) return null
	const rows: QuotaRow[] = []
	for (const [key, window] of windows) {
		const row = windowRow(plan, window, record[key], sampledAt, fields)
		if (row === undefined) return null
		if (row !== null) rows.push(row)
	}
	return rows
}

const CLAUDE_WINDOWS = [
	["five_hour", "five_hour"],
	["seven_day", "weekly"],
] as const

const OPENCODE_WINDOWS = [
	["rolling", "five_hour"],
	["weekly", "weekly"],
	["monthly", "monthly"],
] as const

/** Parses Claude's OAuth usage body into quota rows; null means the body was unexpected. */
export function parseClaudeQuota(body: unknown, sampledAt: string): QuotaRow[] | null {
	return rowsFrom(
		"claude",
		body,
		CLAUDE_WINDOWS,
		{ percent: "utilization", resets: "resets_at" },
		sampledAt,
	)
}

/** Parses OpenCode Go's usage body into quota rows; null means the body was unexpected. */
export function parseOpenCodeQuota(body: unknown, sampledAt: string): QuotaRow[] | null {
	return rowsFrom(
		"opencode-go",
		asObject(body)?.["usage"],
		OPENCODE_WINDOWS,
		{ percent: "percent", resets: "resetsAt" },
		sampledAt,
	)
}
