import { readFileSync } from "node:fs"
import { homedir } from "node:os"
import { credentialsPath } from "../auth/credentials"
import type { AuthFetch } from "../auth/http"
import { parseHostsConfig } from "../hourly/config"
import { defaultStateDir, parseConfigPath } from "../hourly/paths"
import { runHourly } from "../hourly/run"
import { spawnInheritStderr } from "../hourly/spawn"
import { readCursor, writeCursor } from "../hourly/state"
import { errorMessage } from "../message"
import { DEFAULT_INGEST_URL, type FetchLike, sendRows } from "../send"
import { lazyBearer, realBearerDeps, resolveBearer } from "../send/bearer"
import { tokenAllowedFor } from "../send/token-url"
import { type HourlyCommandDeps, runSend } from "./hourly-send"

export type { HourlyCommandDeps } from "./hourly-send"

/** Runs every host's collector, sends the rows, and advances the accepted cursors. */
export async function runHourlyCommand(
	argv: readonly string[],
	deps: HourlyCommandDeps = realHourlyCommandDeps(),
): Promise<void> {
	const path = parseConfigPath(argv, deps.home)
	let config: ReturnType<typeof parseHostsConfig>
	try {
		config = parseHostsConfig(deps.readConfig(path))
	} catch (error) {
		deps.log(`hourly: ${errorMessage(error)}`)
		deps.exit(1)
		return
	}
	const url = deps.env["TRAJ_DATA_URL"] ?? DEFAULT_INGEST_URL
	const bearer = lazyBearer(() =>
		resolveBearer(
			{
				credentialsPath: credentialsPath(deps.home),
				url,
				tokenUrlAllowed: tokenAllowedFor(url, deps.env),
			},
			deps.bearer,
		),
	)
	const report = await runHourly(config, {
		nowMs: deps.nowMs(),
		spawn: deps.spawn,
		readCursor: deps.readCursor,
		writeCursor: deps.writeCursor,
		send: runSend(deps, url, bearer),
		log: deps.log,
	})
	deps.exit(report.ok ? 0 : 1)
}

const postFetch: FetchLike = (url, init) => fetch(url, init)
const authFetch: AuthFetch = (url, init) => fetch(url, init)

function realHourlyCommandDeps(): HourlyCommandDeps {
	const log = (line: string): void => console.error(line)
	const home = homedir()
	const stateDir = defaultStateDir(home)
	return {
		env: process.env,
		home,
		nowMs: () => Date.now(),
		readConfig: (path) => JSON.parse(readFileSync(path, "utf8")),
		spawn: spawnInheritStderr,
		readCursor: (name) => readCursor(stateDir, name),
		writeCursor: (name, iso) => writeCursor(stateDir, name, iso),
		bearer: realBearerDeps(authFetch),
		fetch: postFetch,
		send: sendRows,
		log,
		exit: (code) => {
			process.exitCode = code
		},
	}
}
