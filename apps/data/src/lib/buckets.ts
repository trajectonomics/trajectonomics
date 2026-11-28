import { shortDay } from "./collecting"
import { mondayOf } from "./period"
import { comparePlans, planName } from "./plans"
import { chartSeries } from "./series"
import type { ChartSeries, HourlyRow, UsageRow } from "./types"

/** The daily buckets: one line per plan over the window's days. */
export function daySeries(rows: readonly UsageRow[], days: readonly string[]): ChartSeries[] {
	return chartSeries(rows, days)
}

/**
 * One line per plan over the window's weeks, oldest first. A week is labelled by its Monday and
 * sums only the days inside the window, so a partial first or last week is a partial figure.
 */
export function weekSeries(rows: readonly UsageRow[], days: readonly string[]): ChartSeries[] {
	const weeks = [...new Set(days.map((day) => mondayOf(day)))]
	const weekOf = new Map(days.map((day) => [day, mondayOf(day)]))
	const wanted = new Set(days)
	const totals = new Map<string, Map<string, number>>()
	for (const row of rows) {
		if (!wanted.has(row.day)) continue
		const week = weekOf.get(row.day) as string
		const byWeek = totals.get(row.plan) ?? new Map<string, number>()
		byWeek.set(week, (byWeek.get(week) ?? 0) + row.tokensTotal)
		totals.set(row.plan, byWeek)
	}
	return [...totals.entries()]
		.map(([plan, byWeek]) => ({
			plan,
			name: planName(plan),
			total: weeks.reduce((sum, week) => sum + (byWeek.get(week) ?? 0), 0),
			points: weeks.map((week) => ({
				label: `Week of ${shortDay(week)}`,
				tokens: byWeek.get(week) ?? 0,
			})),
		}))
		.sort(comparePlans)
}

/** The ISO hour at a day and an hour of it, in the spelling the API uses. */
function hourOf(day: string, hour: number): string {
	return `${day}T${String(hour).padStart(2, "0")}:00:00.000Z`
}

/** A bucket's short label: `28 Nov 14:00`. */
function hourLabel(hour: string): string {
	return `${shortDay(hour.slice(0, 10))} ${hour.slice(11, 13)}:00`
}

/**
 * One line per plan over every UTC hour of the window, ending at `lastHour` when the live view
 * gives one. Rows are matched by their parsed instant, so a different ISO spelling still lands in
 * its hour; an hour with no row plots zero.
 */
export function hourSeries(
	rows: readonly HourlyRow[],
	days: readonly string[],
	lastHour: string | null,
): ChartSeries[] {
	const cutoff = lastHour === null ? null : Date.parse(lastHour)
	const hours = days.flatMap((day) =>
		Array.from({ length: 24 }, (_, hour) => hourOf(day, hour)).filter(
			(hour) => cutoff === null || Date.parse(hour) <= cutoff,
		),
	)
	if (hours.length === 0) return []
	const indexes = new Map(hours.map((hour, index) => [Date.parse(hour), index]))
	const totals = new Map<string, number[]>()
	for (const row of rows) {
		const index = indexes.get(Date.parse(row.hourUtc))
		if (index === undefined) continue
		const points = totals.get(row.plan) ?? new Array<number>(hours.length).fill(0)
		points[index] = (points[index] ?? 0) + row.tokensTotal
		totals.set(row.plan, points)
	}
	const labels = hours.map((hour) => hourLabel(hour))
	return [...totals.entries()]
		.map(([plan, points]) => ({
			plan,
			name: planName(plan),
			total: points.reduce((sum, tokens) => sum + tokens, 0),
			points: points.map((tokens, index) => ({ label: labels[index] as string, tokens })),
		}))
		.sort(comparePlans)
}

/** The plans in the rows that report whole days, in the plan table's order. */
export function dayOnlyPlans(rows: readonly UsageRow[]): string[] {
	const plans = new Set(rows.filter((row) => row.granularity === "day").map((row) => row.plan))
	return [...plans].sort((a, b) => comparePlans({ plan: a }, { plan: b })).map(planName)
}

/** The hour view's one-line note about day-only plans, or null when there are none. */
export function dayOnlyNote(names: readonly string[]): string | null {
	if (names.length === 0) return null
	const who =
		names.length === 1
			? names[0]
			: `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
	return names.length === 1
		? `${who} reports whole days, so it has no hourly line.`
		: `${who} report whole days, so they have no hourly line.`
}
