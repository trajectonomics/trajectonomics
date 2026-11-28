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

/**
 * The renderings the performance budget judges: the Site's one address as an English and as a Thai
 * visitor reaches it. The Thai one is asked for with the choice cookie, because the address alone
 * says nothing about the Language (ADR 0020).
 */
const PAGES = [
	{ label: "/", cookie: null },
	{ label: "/ (th)", cookie: "traj_lang=th" },
] as const

/**
 * A hung browser or Worker must not hold CI, so the whole check is bounded. One run takes about 7–8s
 * in CI, so 10 of them (5 per page) plus the Worker's start fit well inside 420s.
 */
const HARD_TIMEOUT_MS = 420_000

/** One mobile Lighthouse run: its performance score and the benchmark index of the runner that ran it. */
interface PerformanceRun {
	readonly score: number | undefined
	readonly benchmarkIndex: number | undefined
}

/** The performance score one mobile Lighthouse run reports, and its runner's benchmark index. */
async function scoreOf(url: string, port: number, cookie: string | null): Promise<PerformanceRun> {
	const result = await lighthouse(url, {
		port,
		output: "json",
		logLevel: "error",
		onlyCategories: ["performance"],
		...(cookie === null ? {} : { extraHeaders: { Cookie: cookie } }),
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
	return {
		score: result?.lhr.categories["performance"]?.score ?? undefined,
		benchmarkIndex: result?.lhr.environment.benchmarkIndex,
	}
}

/** A run's score, or `none` when it has none, so a missing score is visible in the log. */
function scoreText(score: number | undefined): string {
	return score?.toFixed(2) ?? "none"
}

/** A run's benchmark index, or `?` when it has none, so a missing index is visible in the log. */
function benchmarkText(index: number | undefined): string {
	return index?.toString() ?? "?"
}

/** Measure each home `PERFORMANCE_RUNS` times against the local Worker, returning the process exit code. */
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
		for (const page of PAGES) {
			const runs: PerformanceRun[] = []
			for (let run = 1; run <= PERFORMANCE_RUNS; run++) {
				runs.push(await scoreOf(`${baseUrl}/`, debugPort, page.cookie))
			}
			// Every run's score and the runner's benchmark index, so a flake's next diagnosis can tell a
			// slow shared runner from a regression on the page.
			console.log(
				`performance: ${page.label} runs ${runs.map((run) => scoreText(run.score)).join(" ")} (benchmarkIndex ${runs.map((run) => benchmarkText(run.benchmarkIndex)).join(" ")})`,
			)
			const scores = runs.map((run) => run.score)
			const median = medianScore(scores)
			if (median !== undefined)
				console.log(`performance: ${page.label} median ${median.toFixed(2)}`)
			failures.push(...checkPerformance(page.label, scores))
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
