import type { Health, UsagePayload } from "../lib/types"
import type { DayWindow } from "../lib/window"

/** The two reads the overview needs. */
export type OverviewPayload = {
	usage: UsagePayload
	health: Health
}

async function readJson<T>(path: string): Promise<T> {
	const response = await fetch(path, { headers: { accept: "application/json" } })
	if (!response.ok) throw new Error(`${path} answered ${response.status}`)
	return (await response.json()) as T
}

function usagePath(window: DayWindow, asOf: string | null): string {
	const params = new URLSearchParams({ from: window.from, to: window.to })
	if (asOf !== null) params.set("asOf", asOf)
	return `/api/usage?${params.toString()}`
}

/** Fetches the window's rollups and the freshness report; the only module that calls `fetch`. */
export async function loadOverview(
	window: DayWindow,
	asOf: string | null,
): Promise<OverviewPayload> {
	const [usage, health] = await Promise.all([
		readJson<UsagePayload>(usagePath(window, asOf)),
		readJson<Health>("/api/health"),
	])
	return { usage, health }
}
