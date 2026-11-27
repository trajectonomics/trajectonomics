import { errorMessage } from "../message"
import type { IngestRow } from "../rows"
import type { SendReport } from "../send"
import type { HostConfig, HourlyConfig } from "./config"
import { latestUsageHour, sinceForCursor } from "./cursor"
import { collectHost } from "./host"
import type { Spawner } from "./spawn"

/** What one hourly run produced. */
export type HourlyReport = { ok: boolean; failedHosts: string[]; sendOk: boolean }

/** Filesystem, process and network hooks; tests inject all of them. */
export type HourlyDeps = {
	nowMs: number
	spawn: Spawner
	readCursor: (name: string) => string | null
	writeCursor: (name: string, iso: string) => void
	send: (rows: readonly IngestRow[]) => Promise<SendReport>
	log: (line: string) => void
}

type Collected = { host: HostConfig; rows: IngestRow[] }

async function collectAll(
	config: HourlyConfig,
	deps: HourlyDeps,
): Promise<{ collected: Collected[]; failed: string[] }> {
	const collected: Collected[] = []
	const failed: string[] = []
	for (const host of config.hosts) {
		let since: string
		try {
			since = sinceForCursor(deps.readCursor(host.name), deps.nowMs)
		} catch (error) {
			deps.log(`hourly: ${host.name}: ${errorMessage(error)}`)
			failed.push(host.name)
			continue
		}
		const rows = await collectHost(host, since, deps.spawn, deps.log)
		if (rows === null) {
			failed.push(host.name)
			deps.log(`hourly: ${host.name}: skipped, cursor unchanged`)
			continue
		}
		collected.push({ host, rows })
	}
	return { collected, failed }
}

async function sendAll(rows: readonly IngestRow[], deps: HourlyDeps): Promise<SendReport> {
	try {
		return await deps.send(rows)
	} catch (error) {
		deps.log(`hourly: send failed: ${errorMessage(error)}`)
		return { ok: false, batches: [] }
	}
}

function acceptedRows(report: SendReport): Set<IngestRow> {
	const accepted = new Set<IngestRow>()
	for (const batch of report.batches) {
		if (batch.ok) for (const row of batch.rows) accepted.add(row)
	}
	return accepted
}

/** Advances a host's cursor when all its rows were accepted; false when the write failed. */
function advanceHost(
	host: HostConfig,
	rows: readonly IngestRow[],
	accepted: ReadonlySet<IngestRow>,
	deps: HourlyDeps,
): boolean {
	if (!rows.every((row) => accepted.has(row))) {
		deps.log(`hourly: ${host.name}: rows were not accepted, cursor unchanged`)
		return true
	}
	const latest = latestUsageHour(rows)
	if (latest === null) return true
	try {
		deps.writeCursor(host.name, latest)
		return true
	} catch (error) {
		deps.log(`hourly: ${host.name}: cursor not written: ${errorMessage(error)}`)
		return false
	}
}

/**
 * Collects every host, then sends each host's rows on their own, so a row the Worker rejects only
 * holds back the host it came from. Only a host whose rows were all accepted moves its cursor.
 */
export async function runHourly(config: HourlyConfig, deps: HourlyDeps): Promise<HourlyReport> {
	const { collected, failed } = await collectAll(config, deps)
	let sendOk = true
	for (const { host, rows } of collected) {
		if (rows.length === 0) continue
		const report = await sendAll(rows, deps)
		if (!report.ok) sendOk = false
		if (!advanceHost(host, rows, acceptedRows(report), deps)) failed.push(host.name)
	}
	return { ok: failed.length === 0 && sendOk, failedHosts: failed, sendOk }
}
