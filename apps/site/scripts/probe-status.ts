import { checkProbeResponses, PROBE_PATHS, type ProbeResponse } from "../src/lib/probe/status"
import { freePort, signalGroup, startDevServer, stop, waitUntilServing } from "./probe/dev-server"
import { reportFailures } from "./report-failures"

const REQUEST_TIMEOUT_MS = 10_000
const HARD_TIMEOUT_MS = 90_000

async function readResponses(baseUrl: string): Promise<readonly ProbeResponse[]> {
	const responses: ProbeResponse[] = []
	for (const path of PROBE_PATHS) {
		const response = await fetch(`${baseUrl}${path}`, {
			redirect: "manual",
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		})
		await response.arrayBuffer()
		responses.push({
			path,
			status: response.status,
			setCookie: response.headers.get("set-cookie"),
			contentSecurityPolicy: response.headers.get("content-security-policy"),
		})
	}
	return responses
}

/** Probe a local Worker after the build, returning the process exit code. */
export async function main(): Promise<number> {
	const port = await freePort()
	const baseUrl = `http://127.0.0.1:${port}`
	const proc = startDevServer(port, await freePort())
	const hardStop = setTimeout(() => {
		signalGroup(proc, "SIGKILL")
		console.error(`probe:status: no answer within ${HARD_TIMEOUT_MS / 1000}s`)
		process.exit(1)
	}, HARD_TIMEOUT_MS)
	try {
		if (!(await waitUntilServing(baseUrl, proc))) {
			console.error("probe:status: wrangler dev exited before it answered")
			console.error(await new Response(proc.stderr).text())
			return 1
		}
		return reportFailures("probe:status", checkProbeResponses(await readResponses(baseUrl)))
	} finally {
		clearTimeout(hardStop)
		await stop(proc)
	}
}

if (import.meta.main) {
	process.exitCode = await main()
}
