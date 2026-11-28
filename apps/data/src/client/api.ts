import type { BucketKind } from "../lib/period"
import { API_PATH, COLLECTORS_PATH } from "../lib/site"
import type {
	CollectorsPayload,
	Health,
	HourlyPayload,
	PeaksPayload,
	UsagePayload,
} from "../lib/types"
import type { DayWindow } from "../lib/window"

/** The three reads the overview needs; peaks may be absent when that read fails. */
export type OverviewPayload = {
	usage: UsagePayload
	health: Health
	peaks: PeaksPayload | null
}

/** The log's reads; `hourly` is null unless the view groups by hour. */
export type LogPayload = {
	usage: UsagePayload
	health: Health
	hourly: HourlyPayload | null
}

async function readJson<T>(path: string): Promise<T> {
	const response = await fetch(path, { headers: { accept: "application/json" } })
	if (!response.ok) throw new Error(`${path} answered ${response.status}`)
	return (await response.json()) as T
}

function usagePath(window: DayWindow, asOf: string | null): string {
	const params = new URLSearchParams({ from: window.from, to: window.to })
	if (asOf !== null) params.set("asOf", asOf)
	return `${API_PATH}/usage?${params.toString()}`
}

function peaksPath(asOf: string | null): string {
	if (asOf === null) return `${API_PATH}/peaks`
	return `${API_PATH}/peaks?${new URLSearchParams({ asOf }).toString()}`
}

function hourlyPath(window: DayWindow, asOf: string | null): string {
	const params = new URLSearchParams({ from: window.from, to: window.to })
	if (asOf !== null) params.set("asOf", asOf)
	return `${API_PATH}/usage/hourly?${params.toString()}`
}

/** Reads the peaks; a failure hides its section and leaves the rest of the page up. */
async function readPeaks(asOf: string | null): Promise<PeaksPayload | null> {
	try {
		return await readJson<PeaksPayload>(peaksPath(asOf))
	} catch {
		return null
	}
}

async function loadUsageAndHealth(window: DayWindow, asOf: string | null): Promise<LogPayload> {
	const [usage, health] = await Promise.all([
		readJson<UsagePayload>(usagePath(window, asOf)),
		readJson<Health>(`${API_PATH}/health`),
	])
	return { usage, health, hourly: null }
}

/** Fetches the window's rollups, the peaks and the freshness report; the only fetch module. */
export async function loadOverview(
	window: DayWindow,
	asOf: string | null,
): Promise<OverviewPayload> {
	const [usage, health, peaks] = await Promise.all([
		readJson<UsagePayload>(usagePath(window, asOf)),
		readJson<Health>(`${API_PATH}/health`),
		readPeaks(asOf),
	])
	return { usage, health, peaks }
}

/** Fetches the log's rollups, the freshness report and, by the hour, the hourly sums. */
export async function loadLog(
	window: DayWindow,
	asOf: string | null,
	bucket: BucketKind,
): Promise<LogPayload> {
	if (bucket !== "hour") return loadUsageAndHealth(window, asOf)
	const [usage, health, hourly] = await Promise.all([
		readJson<UsagePayload>(usagePath(window, asOf)),
		readJson<Health>(`${API_PATH}/health`),
		readJson<HourlyPayload>(hourlyPath(window, asOf)),
	])
	return { usage, health, hourly }
}

/**
 * Reads the signed-in person's collectors. A 401 is a signed-out browser, not an error; the page
 * then offers the one sign-in action instead of a failure panel.
 */
export async function loadCollectors(): Promise<CollectorsPayload["collectors"] | null> {
	const response = await fetch(COLLECTORS_PATH, {
		headers: { accept: "application/json" },
		credentials: "same-origin",
	})
	if (response.status === 401) return null
	if (!response.ok) throw new Error(`${COLLECTORS_PATH} answered ${response.status}`)
	const body = (await response.json()) as CollectorsPayload
	return body.collectors
}
