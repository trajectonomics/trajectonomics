import { checkProbeResponses } from "../src/lib/probe/check-probe"
import { PROBES, type Probe, type ProbeResponse } from "../src/lib/probe/probes"
import { freePort, signalGroup, startDevServer, stop, waitUntilServing } from "./probe/dev-server"
import { reportFailures } from "./report-failures"

const REQUEST_TIMEOUT_MS = 10_000
const HARD_TIMEOUT_MS = 90_000

/** The headers one probe sends: the Visitor signals and the Language choice the request carries. */
function headersOf(probe: Probe): Record<string, string> {
	const headers: Record<string, string> = {}
	if (probe.acceptLanguage !== null) headers["Accept-Language"] = probe.acceptLanguage
	if (probe.country !== null) headers["CF-IPCountry"] = probe.country
	if (probe.cookie !== null) headers["Cookie"] = probe.cookie
	return headers
}

async function readResponses(baseUrl: string): Promise<readonly ProbeResponse[]> {
	const responses: ProbeResponse[] = []
	for (const probe of PROBES) {
		const response = await fetch(`${baseUrl}${probe.path}`, {
			redirect: "manual",
			headers: headersOf(probe),
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		})
		const html = await response.text()
		responses.push({
			probe,
			status: response.status,
			location: response.headers.get("location"),
			setCookies: response.headers.getSetCookie(),
			vary: response.headers.get("vary"),
			cacheControl: response.headers.get("cache-control"),
			etag: response.headers.get("etag"),
			contentSecurityPolicy: response.headers.get("content-security-policy"),
			contentType: response.headers.get("content-type"),
			html,
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
