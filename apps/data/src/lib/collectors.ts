import type { Collector } from "../core/collectors"
import { daysBetween, utcDay } from "./window"

/** The drawing's user units: the same 720-wide frame the other charts use. */
export const COLLECTORS_WIDTH = 720
export const COLLECTORS_TOP = 16
export const COLLECTORS_ROW_HEIGHT = 48
export const COLLECTORS_BAR_Y = 12
export const COLLECTORS_BAR_HEIGHT = 14
export const COLLECTORS_BAR_LEFT = 168
export const COLLECTORS_BAR_RIGHT = 560

const OK_MS = 2 * 3_600_000
const LATE_MS = 26 * 3_600_000

/** A collector's liveness: under two hours is ok, under 26 hours is late, then stopped. */
export type CollectorState = "ok" | "late" | "stopped"

/** The state from the last send's age; exactly two hours is late, exactly 26 is stopped. */
export function collectorState(lastSendAt: string, nowMs: number): CollectorState {
	const at = Date.parse(lastSendAt)
	if (Number.isNaN(at)) return "stopped"
	const age = nowMs - at
	if (age < OK_MS) return "ok"
	if (age < LATE_MS) return "late"
	return "stopped"
}

/** A compact age: minutes under an hour, hours under two days, then days. */
export function relativeAge(lastSendAt: string, nowMs: number): string {
	const at = Date.parse(lastSendAt)
	if (Number.isNaN(at)) return "unknown"
	const minutes = Math.max(0, Math.floor((nowMs - at) / 60_000))
	if (minutes < 60) return `${minutes} min ago`
	const hours = Math.floor(minutes / 60)
	if (hours < 48) return `${hours} h ago`
	return `${Math.floor(hours / 24)} d ago`
}

function clamp(value: number): number {
	return Math.min(1, Math.max(0, value))
}

/** One machine's bar on the shared axis, plus the state and age its labels carry. */
export type CollectorBar = Collector & {
	state: CollectorState
	ageLabel: string
	x: number
	width: number
}

/** Everything the collectors picture draws, computed without a browser. */
export type CollectorsGeometry = {
	width: number
	height: number
	from: string
	to: string
	bars: CollectorBar[]
}

/**
 * Places one bar per machine from the earliest first day to today (UTC). A bar covers whole days,
 * so its right edge is the day after its last day, clamped to the axis's end.
 */
export function collectorsGeometry(
	rows: readonly Collector[],
	nowMs: number,
): CollectorsGeometry | null {
	if (rows.length === 0) return null
	const from = [...rows].map((row) => row.firstDay).sort()[0] ?? utcDay(nowMs)
	const to = utcDay(nowMs)
	const days = Math.max(1, daysBetween(from, to) + 1)
	const plot = COLLECTORS_BAR_RIGHT - COLLECTORS_BAR_LEFT
	const bars = rows.map((row) => {
		const start = clamp(daysBetween(from, row.firstDay) / days)
		const end = clamp((daysBetween(from, row.lastDay) + 1) / days)
		return {
			...row,
			state: collectorState(row.lastSendAt, nowMs),
			ageLabel: relativeAge(row.lastSendAt, nowMs),
			x: COLLECTORS_BAR_LEFT + start * plot,
			width: Math.max(2, (end - start) * plot),
		}
	})
	return {
		width: COLLECTORS_WIDTH,
		height: COLLECTORS_TOP + rows.length * COLLECTORS_ROW_HEIGHT + 28,
		from,
		to,
		bars,
	}
}

/** The picture's summary: how many collectors, and how many sent in the last two hours. */
export function collectorsAriaLabel(bars: readonly CollectorBar[]): string {
	const noun = bars.length === 1 ? "collector" : "collectors"
	const ok = bars.filter((bar) => bar.state === "ok").length
	return `${bars.length} ${noun}; ${ok} sent in the last 2 hours`
}

/** An ISO timestamp as its exact UTC minute, for the Details table. */
export function exactMinute(iso: string): string {
	if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(iso)) return iso
	return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`
}
