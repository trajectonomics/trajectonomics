import type { UsageRow } from "@trajectonomics/data-collector/types"
import { usageRow } from "./fixtures"

/** One window's peak in a peaks body. */
export type Peak = { tokens: number; fromDay: string; cacheRead: number }

/** One measure's estimate in a peaks body. */
export type Measure = { value: number; low: number; high: number | null }

/** One window's meter estimate in a peaks body. */
export type Limit = {
	tokens: number
	low: number
	high: number | null
	processed: Measure
	usd: Measure | null
	points: number
	readings: number
	rough: boolean
	derived?: boolean
}

/** A plan's three meter estimates. */
export type Limits = { fiveHours: Limit | null; sevenDays: Limit | null; thirtyDays: Limit | null }

/** One tier's measured peaks. */
export type MeasuredTier = {
	tier: string | null
	fiveHours: Peak | null
	sevenDays: Peak | null
	thirtyDays: Peak | null
	limits?: Limits | null
}

/** The peaks API body as a test reads it. */
export type PeaksBody = {
	asOf: string
	methodVersion: number
	plans: {
		plan: string
		tier: string | null
		fiveHours: Peak | null
		sevenDays: Peak | null
		thirtyDays: Peak | null
		limits?: Limits | null
		measured: MeasuredTier[]
	}[]
}

/** A row whose total is the only token figure, so a synthetic sum is not checked against parts. */
export function withTotal(total: number, overrides: Partial<UsageRow> = {}): UsageRow {
	return usageRow({
		tokensIn: null,
		tokensOut: null,
		cacheRead: null,
		cacheWrite: null,
		tokensTotal: total,
		...overrides,
	})
}

/** Every key and string value in a JSON body, to prove no hour leaves the Worker. */
export function texts(value: unknown): string[] {
	if (typeof value === "string" || typeof value === "number") return [String(value)]
	if (Array.isArray(value)) return value.flatMap(texts)
	if (value !== null && typeof value === "object") {
		return Object.entries(value).flatMap(([key, entry]) => [key, ...texts(entry)])
	}
	return []
}
