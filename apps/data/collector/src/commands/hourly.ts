import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { parseHostsConfig } from "../hourly/config"
import { cursorPath } from "../hourly/cursor"
import { runHourly } from "../hourly/run"
import { spawnInheritStderr } from "../hourly/spawn"
import { errorMessage } from "../message"
import { DEFAULT_INGEST_URL, defaultKeyFile, type FetchLike, sendRows } from "../send"
import { realBearerOptions, resolveBearer } from "../send/bearer"
import { fail } from "./errors"

const USAGE = "Usage: bun src/cli.ts hourly [--config <path>]"

const log = (line: string): void => console.error(line)
const postFetch: FetchLike = (url, init) => fetch(url, init)

/** The default hosts file. */
export function defaultConfigPath(home: string): string {
	return join(home, ".config/traj-data/hosts.json")
}

/** The default state directory that holds one cursor per host. */
export function defaultStateDir(home: string): string {
	return join(home, ".local/state/traj-data")
}

function parseConfigPath(argv: readonly string[], home: string): string {
	let path = defaultConfigPath(home)
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i] ?? ""
		if (arg === "--help" || arg === "-h") {
			console.log(USAGE)
			process.exit(0)
		}
		if (arg !== "--config") fail(`Unknown argument: ${arg}`, USAGE)
		const value = argv[i + 1]
		if (value === undefined) fail("--config needs a value", USAGE)
		path = value
		i += 1
	}
	return path
}

function readCursor(stateDir: string, name: string): string | null {
	try {
		const text = readFileSync(cursorPath(stateDir, name), "utf8").trim()
		return text.length === 0 ? null : text
	} catch {
		return null
	}
}

function writeCursor(stateDir: string, name: string, iso: string): void {
	mkdirSync(stateDir, { recursive: true })
	const path = cursorPath(stateDir, name)
	const temporary = `${path}.${process.pid}.tmp`
	writeFileSync(temporary, `${iso}\n`, { mode: 0o600 })
	renameSync(temporary, path)
}

/** Runs every host's collector, sends the rows, and advances the accepted cursors. */
export async function runHourlyCommand(argv: readonly string[]): Promise<void> {
	const home = homedir()
	const path = parseConfigPath(argv, home)
	let config: ReturnType<typeof parseHostsConfig>
	let bearer: string
	try {
		config = parseHostsConfig(JSON.parse(readFileSync(path, "utf8")))
		const resolved = await resolveBearer(realBearerOptions(defaultKeyFile(home), postFetch, log))
		bearer = resolved.bearer
	} catch (error) {
		console.error(`hourly: ${errorMessage(error)}`)
		process.exitCode = 1
		return
	}
	const stateDir = defaultStateDir(home)
	const url = process.env["TRAJ_DATA_URL"] ?? DEFAULT_INGEST_URL
	const report = await runHourly(config, {
		nowMs: Date.now(),
		spawn: spawnInheritStderr,
		readCursor: (name) => readCursor(stateDir, name),
		writeCursor: (name, iso) => writeCursor(stateDir, name, iso),
		send: (rows) => sendRows(rows, { url, bearer, fetch: postFetch, log }),
		log,
	})
	process.exitCode = report.ok ? 0 : 1
}
