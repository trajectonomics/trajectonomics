import { comparePlans, planName } from "./plans"
import { sumNullable, sumOf } from "./sum"
import type { UsageRow } from "./types"
import { daysBetween } from "./window"

/** A plan is in use when its last active day is at most this many days before the window end. */
const IN_USE_DAYS = 7

/** One plan's activity over the window, and how its tokens break down. */
export type PlanTotal = {
	plan: string
	planName: string
	tokensTotal: number
	requests: number
	tokensIn: number | null
	tokensOut: number | null
	cacheRead: number | null
	cacheWrite: number | null
	/** Days with at least one token. */
	activeDays: number
	/** Tokens divided by active days; zero when the plan has no active day. */
	tokensPerActiveDay: number
	/** The day with the most tokens, the earliest on a tie; null when the plan has none. */
	busiestDay: { day: string; tokens: number } | null
	/** The latest day with tokens. */
	lastDay: string | null
	/** Whether the last active day is at most seven days before the window end. */
	inUse: boolean
	/** Cache reads as a share of total tokens; null when no row reports a breakdown. */
	cacheShare: number | null
	/** At least one of the plan's rows comes from a daily export. */
	daily: boolean
	/** At least one of the plan's rows comes from a best-effort source. */
	bestEffort: boolean
}

/** API rows to one total per plan over the window, ranked by tokens per active day. */
export function planTotals(rows: readonly UsageRow[], to: string): PlanTotal[] {
	const groups = new Map<string, UsageRow[]>()
	for (const row of rows) {
		const group = groups.get(row.plan) ?? []
		group.push(row)
		groups.set(row.plan, group)
	}
	return [...groups.entries()]
		.map(([plan, group]) => summaryOf(plan, group, to))
		.sort((a, b) => b.tokensPerActiveDay - a.tokensPerActiveDay || comparePlans(a, b))
}

/**
 * The source note a plan's row carries, or null when it needs none. It says "includes", because
 * one daily or best-effort row marks the plan while its other rows may be hourly and exact.
 */
export function planNote(total: Pick<PlanTotal, "daily" | "bestEffort">): string | null {
	const notes: string[] = []
	if (total.daily) notes.push("includes a daily export")
	if (total.bestEffort) notes.push("includes a best-effort source")
	return notes.length === 0 ? null : notes.join(" · ")
}

function summaryOf(plan: string, group: readonly UsageRow[], to: string): PlanTotal {
	const days = new Map<string, number>()
	for (const row of group) days.set(row.day, (days.get(row.day) ?? 0) + row.tokensTotal)
	const active = [...days.entries()].filter(([, tokens]) => tokens > 0)
	const tokensTotal = sumOf(group, (row) => row.tokensTotal)
	const cacheRead = sumNullable(group.map((row) => row.cacheRead))
	const reported = group.some(
		(row) => row.tokensIn !== null || row.tokensOut !== null || row.cacheRead !== null,
	)
	const lastDay = active.reduce<string | null>(
		(latest, [day]) => (latest === null || day > latest ? day : latest),
		null,
	)
	return {
		plan,
		planName: planName(plan),
		tokensTotal,
		requests: sumOf(group, (row) => row.requests),
		tokensIn: sumNullable(group.map((row) => row.tokensIn)),
		tokensOut: sumNullable(group.map((row) => row.tokensOut)),
		cacheRead,
		cacheWrite: sumNullable(group.map((row) => row.cacheWrite)),
		activeDays: active.length,
		tokensPerActiveDay: active.length === 0 ? 0 : tokensTotal / active.length,
		busiestDay: busiestOf(active),
		lastDay,
		inUse: lastDay !== null && daysBetween(lastDay, to) <= IN_USE_DAYS,
		cacheShare: reported ? (tokensTotal === 0 ? 0 : (cacheRead ?? 0) / tokensTotal) : null,
		daily: group.some((row) => row.granularity === "day"),
		bestEffort: group.some((row) => row.bestEffort),
	}
}

function busiestOf(days: readonly (readonly [string, number])[]): PlanTotal["busiestDay"] {
	let best: PlanTotal["busiestDay"] = null
	for (const [day, tokens] of days) {
		if (best === null || tokens > best.tokens || (tokens === best.tokens && day < best.day)) {
			best = { day, tokens }
		}
	}
	return best
}
