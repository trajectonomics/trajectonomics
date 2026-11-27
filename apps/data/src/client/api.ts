import { API_PATH } from "../lib/site"
import type { Health, PeaksPayload, UsagePayload } from "../lib/types"
import type { DayWindow } from "../lib/window"

/** The three reads the overview needs; peaks may be absent when that read fails. */
export type OverviewPayload = {
	usage: UsagePayload
	health: Health
	peaks: PeaksPayload | null
}

/** The two reads the log needs. */
export type LogPayload = {
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
	return `${API_PATH}/usage?${params.toString()}`
}

function peaksPath(asOf: string | null): string {
	if (asOf === null) return `${API_PATH}/peaks`
	return `${API_PATH}/peaks?${new URLSearchParams({ asOf }).toString()}`
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
	return { usage, health }
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

/** Fetches the log's rollups and the freshness report. */
export async function loadLog(window: DayWindow, asOf: string | null): Promise<LogPayload> {
	return loadUsageAndHealth(window, asOf)
}
