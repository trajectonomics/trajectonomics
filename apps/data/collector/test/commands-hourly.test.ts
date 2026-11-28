import { describe, expect, test } from "bun:test"
import type { AuthFetch } from "../src/auth/http"
import { type HourlyCommandDeps, runHourlyCommand } from "../src/commands/hourly"
import type { HostConfig } from "../src/hourly/config"
import type { Spawner } from "../src/hourly/spawn"
import type { IngestRow } from "../src/rows"
import type { SendConfig, SendReport } from "../src/send"
import type { BearerDeps } from "../src/send/bearer"
import { credentials, queueFetch, ROTATED_ACCESS, ROTATED_REFRESH, tokenBody } from "./support/auth"
import { usageRow } from "./support/rows"

const HOME = "/home/synthetic"
const NOW = Date.parse("2026-11-27T14:26:00.000Z")
const ROW = usageRow({ hourUtc: "2026-11-27T10:00:00.000Z" })

const HOST: HostConfig = {
	name: "alpha",
	ssh: null,
	bun: "/synthetic/bun",
	collectorDir: "/synthetic/collector",
	quota: false,
	skipOpenCodeBefore: null,
}

const BETA: HostConfig = { ...HOST, name: "beta" }

function makeDeps(options: {
	fetch: AuthFetch
	spawn: Spawner
	send?: (rows: readonly IngestRow[], config: SendConfig) => Promise<SendReport>
	readCredentials?: BearerDeps["readCredentials"]
}) {
	const events: string[] = []
	const logs: string[] = []
	const exits: number[] = []
	const bearer: BearerDeps = {
		readCredentials:
			options.readCredentials ??
			(() => {
				events.push("credentials")
				return credentials()
			}),
		saveCredentials: () => {
			events.push("save")
		},
		fetch: options.fetch,
		nowIso: () => "2026-11-28T12:00:00.000Z",
		sleep: async () => {},
	}
	const deps: HourlyCommandDeps = {
		env: {},
		home: HOME,
		nowMs: () => NOW,
		readConfig: () => {
			events.push("config")
			return { hosts: [HOST, BETA] }
		},
		spawn: options.spawn,
		readCursor: () => null,
		writeCursor: (name) => {
			events.push(`cursor:${name}`)
		},
		bearer,
		fetch: async () => {
			events.push("fetch")
			return { ok: true, status: 200, json: async () => ({}) }
		},
		send:
			options.send ??
			(async (rows, config) => {
				events.push(`send:${config.bearer}`)
				return { ok: true, batches: rows.length === 0 ? [] : [{ rows: [...rows], ok: true }] }
			}),
		log: (line) => logs.push(line),
		exit: (code) => exits.push(code),
	}
	return { deps, events, logs, exits }
}

function spawnRow(): Spawner {
	return async () => ({ exitCode: 0, stdout: JSON.stringify(ROW) })
}

describe("runHourlyCommand wiring", () => {
	test("mints the token at the first send, after every host was collected", async () => {
		const fetched = queueFetch([
			{
				status: 200,
				body: tokenBody({ access_token: ROTATED_ACCESS, refresh_token: ROTATED_REFRESH }),
			},
		])
		const run = makeDeps({ fetch: fetched.fetch, spawn: spawnRow() })

		await runHourlyCommand([], run.deps)

		expect(run.events).toEqual([
			"config",
			"credentials",
			"save",
			"save",
			`send:${ROTATED_ACCESS}`,
			"cursor:alpha",
			`send:${ROTATED_ACCESS}`,
			"cursor:beta",
		])
		expect(fetched.calls).toHaveLength(1)
		expect(run.exits).toEqual([0])
	})

	test("a bearer failure is reported once, fails the run and moves no cursor", async () => {
		const fetched = queueFetch([{ status: 400, body: { error: "invalid_grant" } }])
		const run = makeDeps({ fetch: fetched.fetch, spawn: spawnRow() })

		await runHourlyCommand([], run.deps)

		const bearerErrors = run.logs.filter((line) => line.includes("sign-in expired"))
		expect(bearerErrors).toHaveLength(1)
		expect(bearerErrors[0]).toStartWith("hourly: sign-in expired")
		expect(fetched.calls).toHaveLength(1)
		expect(run.events).not.toContain("cursor:alpha")
		expect(run.events).not.toContain("cursor:beta")
		expect(run.exits).toEqual([1])
	})

	test("a broken credentials read fails before any host is sent", async () => {
		const fetched = queueFetch([])
		const run = makeDeps({
			fetch: fetched.fetch,
			spawn: spawnRow(),
			readCredentials: () => {
				throw new Error("credentials file must be a regular file")
			},
		})

		await runHourlyCommand([], run.deps)

		expect(run.logs.some((line) => line.includes("must be a regular file"))).toBe(true)
		expect(run.exits).toEqual([1])
	})
})
