import { type Browser, chromium } from "@playwright/test"
import lighthouse from "lighthouse"
import {
	checkPerformance,
	medianScore,
	PERFORMANCE_RUNS,
	type PerformanceFailure,
} from "../src/lib/browser/performance"
import { freePort, signalGroup, startDevServer, stop, waitUntilServing } from "./probe/dev-server"
import { reportFailures } from "./report-failures"

/** The pages the performance budget judges: the home of each Language. */
const PAGES = ["/th/", "/en/"] as const

/** A hung browser or Worker must not hold CI, so the whole check is bounded. */
const HARD_TIMEOUT_MS = 420_000

/** The performance score one mobile Lighthouse run reports, or `undefined` when it has none. */
async function scoreOf(url: string, port: number): Promise<number | undefined> {
	const result = await lighthouse(url, {
		port,
		output: "json",
		logLevel: "error",
		onlyCategories: ["performance"],
		formFactor: "mobile",
		screenEmulation: {
			mobile: true,
			width: 412,
			height: 823,
			deviceScaleFactor: 1.75,
			disabled: false,
		},
		throttlingMethod: "simulate",
	})
	return result?.lhr.categories["performance"]?.score ?? undefined
}

/** Measure each home three times against the local Worker, returning the process exit code. */
export async function main(): Promise<number> {
	const port = await freePort()
	const baseUrl = `http://127.0.0.1:${port}`
	const devServer = startDevServer(port, await freePort())
	const debugPort = await freePort()
	let browser: Browser | undefined
	const hardStop = setTimeout(() => {
		console.error(`performance: no answer within ${HARD_TIMEOUT_MS / 1000}s`)
		signalGroup(devServer, "SIGKILL")
		process.exit(1)
	}, HARD_TIMEOUT_MS)
	try {
		if (!(await waitUntilServing(baseUrl, devServer))) {
			console.error("performance: wrangler dev exited before it answered")
			console.error(await new Response(devServer.stderr).text())
			return 1
		}
		// Chromium with a debugging port is what Lighthouse drives; Playwright installed it already.
		browser = await chromium.launch({ args: [`--remote-debugging-port=${debugPort}`] })
		const failures: PerformanceFailure[] = []
		for (const path of PAGES) {
			const scores: (number | undefined)[] = []
			for (let run = 1; run <= PERFORMANCE_RUNS; run++) {
				scores.push(await scoreOf(`${baseUrl}${path}`, debugPort))
			}
			const median = medianScore(scores)
			if (median !== undefined) console.log(`performance: ${path} median ${median.toFixed(2)}`)
			failures.push(...checkPerformance(path, scores))
		}
		return reportFailures("performance", failures)
	} finally {
		clearTimeout(hardStop)
		await browser?.close()
		await stop(devServer)
	}
}

if (import.meta.main) {
	process.exitCode = await main()
}
