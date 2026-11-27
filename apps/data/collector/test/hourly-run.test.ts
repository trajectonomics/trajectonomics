import { describe, expect, test } from "bun:test"
import type { HostConfig } from "../src/hourly/config"
import { runHourly } from "../src/hourly/run"
import type { Spawner, SpawnResult } from "../src/hourly/spawn"
import type { IngestRow } from "../src/rows"
import type { SendReport } from "../src/send/client"
import { quotaRow, usageRow } from "./support/rows"

const NOW = Date.parse("2026-11-27T14:26:00.000Z")

const ALPHA: HostConfig = {
	name: "alpha",
	ssh: null,
	bun: "/synthetic/bun",
	collectorDir: "/synthetic/collector",
	quota: true,
	skipOpenCodeBefore: null,
}

const BETA: HostConfig = { ...ALPHA, name: "beta", ssh: "beta-synthetic", quota: false }

type Outcome = SpawnResult | Error

function makeSpawner(handler: (argv: readonly string[]) => Outcome) {
	const calls: string[][] = []
	const spawn: Spawner = async (argv) => {
		calls.push([...argv])
		const outcome = handler(argv)
		if (outcome instanceof Error) throw outcome
		return outcome
	}
	return { calls, spawn }
}

function acceptingSend() {
	const sent: IngestRow[][] = []
	const send = async (rows: readonly IngestRow[]): Promise<SendReport> => {
		sent.push([...rows])
		return { ok: true, batches: rows.length === 0 ? [] : [{ rows: [...rows], ok: true }] }
	}
	return { sent, send }
}

function makeCursors(initial: Record<string, string> = {}) {
	const values = new Map(Object.entries(initial))
	const writes: { name: string; iso: string }[] = []
	return {
		writes,
		read: (name: string) => values.get(name) ?? null,
		write: (name: string, iso: string) => {
			values.set(name, iso)
			writes.push({ name, iso })
		},
	}
}

function makeDeps(
	spawn: Spawner,
	send: (rows: readonly IngestRow[]) => Promise<SendReport>,
	cursors: ReturnType<typeof makeCursors>,
) {
	const logs: string[] = []
	return {
		logs,
		deps: {
			nowMs: NOW,
			spawn,
			readCursor: cursors.read,
			writeCursor: cursors.write,
			send,
			log: (line: string) => logs.push(line),
		},
	}
}

describe("runHourly", () => {
	test("skips a failed host and still sends and advances the others", async () => {
		const betaRow = usageRow({ model: "claude-beta", hourUtc: "2026-11-27T10:00:00.000Z" })
		const { calls, spawn } = makeSpawner((argv) =>
			argv[0] === "ssh"
				? { exitCode: 0, stdout: JSON.stringify(betaRow) }
				: { exitCode: 2, stdout: "" },
		)
		const { sent, send } = acceptingSend()
		const cursors = makeCursors()
		const { deps, logs } = makeDeps(spawn, send, cursors)
		const report = await runHourly({ hosts: [ALPHA, BETA] }, deps)

		expect(report).toEqual({ ok: false, failedHosts: ["alpha"], sendOk: true })
		expect(sent).toEqual([[betaRow]])
		expect(cursors.writes).toEqual([{ name: "beta", iso: "2026-11-27T10:00:00.000Z" }])
		expect(logs.some((line) => line.includes("alpha") && line.includes("exited"))).toBe(true)
		const betaCall = calls.find((argv) => argv[0] === "ssh")
		expect(betaCall?.slice(0, 2)).toEqual(["ssh", "-o"])
		expect(betaCall?.slice(betaCall.indexOf("--"), betaCall.indexOf("--") + 2)).toEqual([
			"--",
			"beta-synthetic",
		])
		expect(betaCall).toContain("2026-11-27T14:00:00.000Z")
	})

	test("sends every host's usage and quota and advances both cursors", async () => {
		const alphaRow = usageRow({ hourUtc: "2026-11-27T09:00:00.000Z" })
		const betaRow = usageRow({ model: "claude-beta", hourUtc: "2026-11-27T11:00:00.000Z" })
		const quota = quotaRow({ sampledAt: "2026-11-27T09:00:00.000Z" })
		const { spawn } = makeSpawner((argv) => {
			if (argv[0] === "ssh") return { exitCode: 0, stdout: JSON.stringify(betaRow) }
			if (argv.includes("quota")) {
				return { exitCode: 0, stdout: JSON.stringify({ kind: "quota", ...quota }) }
			}
			return { exitCode: 0, stdout: JSON.stringify(alphaRow) }
		})
		const { sent, send } = acceptingSend()
		const cursors = makeCursors()
		const { deps } = makeDeps(spawn, send, cursors)
		const report = await runHourly({ hosts: [ALPHA, BETA] }, deps)

		expect(report).toEqual({ ok: true, failedHosts: [], sendOk: true })
		expect(sent).toEqual([[alphaRow, quota], [betaRow]])
		expect(cursors.writes).toEqual([
			{ name: "alpha", iso: "2026-11-27T09:00:00.000Z" },
			{ name: "beta", iso: "2026-11-27T11:00:00.000Z" },
		])
	})

	test("leaves a cursor unchanged when the send is rejected", async () => {
		const betaRow = usageRow({ hourUtc: "2026-11-27T10:00:00.000Z" })
		const { spawn } = makeSpawner((argv) =>
			argv[0] === "ssh"
				? { exitCode: 0, stdout: JSON.stringify(betaRow) }
				: { exitCode: 0, stdout: "" },
		)
		const send = async (rows: readonly IngestRow[]): Promise<SendReport> => ({
			ok: false,
			batches: [{ rows: [...rows], ok: false }],
		})
		const cursors = makeCursors()
		const { deps, logs } = makeDeps(spawn, send, cursors)
		const report = await runHourly({ hosts: [BETA] }, deps)

		expect(report).toEqual({ ok: false, failedHosts: [], sendOk: false })
		expect(cursors.writes).toEqual([])
		expect(logs.some((line) => line.includes("not accepted"))).toBe(true)
	})

	test("keeps going when the spawner throws", async () => {
		const { spawn } = makeSpawner(() => new Error("synthetic offline"))
		const { sent, send } = acceptingSend()
		const cursors = makeCursors()
		const { deps, logs } = makeDeps(spawn, send, cursors)
		const report = await runHourly({ hosts: [ALPHA] }, deps)

		expect(report).toEqual({ ok: false, failedHosts: ["alpha"], sendOk: true })
		expect(sent).toEqual([])
		expect(cursors.writes).toEqual([])
		expect(logs.some((line) => line.includes("could not run"))).toBe(true)
	})

	test("a rejected host does not hold back another host", async () => {
		const alphaRow = usageRow({ hourUtc: "2026-11-27T09:00:00.000Z" })
		const betaRow = usageRow({ model: "claude-beta", hourUtc: "2026-11-27T11:00:00.000Z" })
		const { spawn } = makeSpawner((argv) =>
			argv[0] === "ssh"
				? { exitCode: 0, stdout: JSON.stringify(betaRow) }
				: { exitCode: 0, stdout: JSON.stringify(alphaRow) },
		)
		const send = async (rows: readonly IngestRow[]): Promise<SendReport> => {
			const ok = rows.some((row) => "model" in row && row.model === "claude-beta")
			return { ok, batches: [{ rows: [...rows], ok }] }
		}
		const cursors = makeCursors()
		const { deps } = makeDeps(spawn, send, cursors)
		const report = await runHourly({ hosts: [{ ...ALPHA, quota: false }, BETA] }, deps)

		expect(report.sendOk).toBe(false)
		expect(cursors.writes).toEqual([{ name: "beta", iso: "2026-11-27T11:00:00.000Z" }])
	})

	test("marks a host failed when its cursor cannot be written", async () => {
		const betaRow = usageRow({ hourUtc: "2026-11-27T10:00:00.000Z" })
		const { spawn } = makeSpawner(() => ({ exitCode: 0, stdout: JSON.stringify(betaRow) }))
		const { send } = acceptingSend()
		const cursors = makeCursors()
		const { deps, logs } = makeDeps(spawn, send, cursors)
		const report = await runHourly(
			{ hosts: [BETA] },
			{
				...deps,
				writeCursor: () => {
					throw new Error("synthetic disk full")
				},
			},
		)

		expect(report).toEqual({ ok: false, failedHosts: ["beta"], sendOk: true })
		expect(logs.some((line) => line.includes("cursor not written"))).toBe(true)
	})
})
