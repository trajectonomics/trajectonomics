import { describe, expect, test } from "bun:test"
import type { Credentials } from "../src/auth/credentials"
import type { AuthFetch } from "../src/auth/http"
import type { SendCommandDeps } from "../src/commands/send"
import { runSendCommand } from "../src/commands/send"
import type { SendConfig, SendReport } from "../src/send"
import type { BearerDeps } from "../src/send/bearer"
import { credentials, queueFetch, ROTATED_ACCESS, ROTATED_REFRESH, tokenBody } from "./support/auth"

const HOME = "/home/synthetic"
const KEY_FILE = "/home/synthetic/.config/traj-data/ingest.key"

function makeDeps(options: {
	fetch: AuthFetch
	credentials?: Credentials | null
	readCredentials?: () => Credentials | null
	readInput?: (files: readonly string[]) => Promise<string>
	send?: (text: string, config: SendConfig) => Promise<SendReport>
	events?: string[]
}) {
	const events = options.events ?? []
	const printed: string[] = []
	const exits: number[] = []
	const bearer: BearerDeps = {
		readCredentials:
			options.readCredentials ??
			(() => {
				events.push("credentials")
				return options.credentials ?? null
			}),
		saveCredentials: () => {
			events.push("save")
		},
		readKey: () => {
			events.push("key")
			return "synthetic-ingest-key"
		},
		fetch: options.fetch,
		nowIso: () => "2026-11-28T12:00:00.000Z",
		sleep: async () => {},
		log: (line) => printed.push(line),
	}
	const deps: SendCommandDeps = {
		env: {},
		home: HOME,
		readInput:
			options.readInput ??
			(async () => {
				events.push("input")
				return "synthetic rows"
			}),
		bearer,
		fetch: async (_url, _init) => {
			events.push("fetch")
			return { ok: true, status: 200, json: async () => ({}) }
		},
		send:
			options.send ??
			(async (text, config) => {
				events.push(`send:${text}:${config.bearer}`)
				return { ok: true, batches: [] }
			}),
		log: (line) => printed.push(line),
		exit: (code) => exits.push(code),
	}
	return { deps, events, printed, exits }
}

function granted(access: string, refresh: string) {
	return queueFetch([
		{ status: 200, body: tokenBody({ access_token: access, refresh_token: refresh }) },
	])
}

describe("runSendCommand wiring", () => {
	test("reads the input before it resolves the bearer", async () => {
		const fetched = granted(ROTATED_ACCESS, ROTATED_REFRESH)
		const run = makeDeps({ fetch: fetched.fetch, credentials: credentials() })

		await runSendCommand([], run.deps)

		expect(run.events).toEqual([
			"input",
			"credentials",
			"save",
			"save",
			`send:synthetic rows:${ROTATED_ACCESS}`,
		])
		expect(run.exits).toEqual([0])
	})

	test("an explicit --key-file skips the credentials file", async () => {
		const fetched = queueFetch([])
		const run = makeDeps({ fetch: fetched.fetch, credentials: credentials() })

		await runSendCommand(["--key-file", KEY_FILE], run.deps)

		expect(run.events).toEqual(["input", "key", "send:synthetic rows:synthetic-ingest-key"])
		expect(fetched.calls).toHaveLength(0)
		expect(run.exits).toEqual([0])
	})

	test("reports a bearer failure with the send prefix and exits 1", async () => {
		const fetched = queueFetch([])
		const run = makeDeps({
			fetch: fetched.fetch,
			readCredentials: () => {
				throw new Error("credentials file is malformed")
			},
		})

		await runSendCommand([], run.deps)

		expect(run.printed).toEqual(["send: credentials file is malformed"])
		expect(run.events).toEqual(["input"])
		expect(run.exits).toEqual([1])
	})

	test("reports an input failure before resolving the bearer", async () => {
		const fetched = queueFetch([])
		const run = makeDeps({
			fetch: fetched.fetch,
			readInput: async () => {
				throw new Error("synthetic missing file")
			},
		})

		await runSendCommand([], run.deps)

		expect(run.printed).toEqual(["send: synthetic missing file"])
		expect(run.events).toEqual([])
		expect(run.exits).toEqual([1])
	})
})
