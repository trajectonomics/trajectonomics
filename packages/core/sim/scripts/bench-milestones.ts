// Times chance of success, FI and project on a 30-year monthly Scenario with 0, 1 and 3 metric
// Milestones that never fire, so each is evaluated on every date. Run: bun run bench:milestones
// Prints the median of RUNS CPU times per row, in ms (the machine is shared, so wall time is not
// comparable between runs), the first run alone (cold: later runs reuse the caches of the first),
// and a hash of the whole result, which must not change between versions or between runs.
// RUNS, PATHS (chance of success) and FI_PATHS (probability FI) are read from the environment.

import { thaiEmployee } from "../src/fixtures/thai-employee"
import { chanceOfSuccess, financialIndependence, project } from "../src/index"
import type { Milestone, Scenario } from "../src/types"
import { accounts, balance, model, window } from "./bench-milestone-set"

const RUNS = Number(process.env.RUNS ?? 5)
const PATHS = Number(process.env.PATHS ?? 200)
const FI_PATHS = Number(process.env.FI_PATHS ?? 4)
const { baseline, scenario, timeline } = thaiEmployee
function median(values: number[]): number {
	return [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!
}

function time(label: string, run: () => unknown): void {
	const ms: number[] = []
	let digest = ""
	for (let index = 0; index < RUNS; index++) {
		const started = process.cpuUsage()
		const result = run()
		const used = process.cpuUsage(started)
		const hash = Bun.hash(JSON.stringify(result)).toString(16)
		if (digest !== "" && digest !== hash) throw new Error(`${label}: results differ between runs`)
		digest = hash
		ms.push((used.user + used.system) / 1000)
	}
	console.log(
		`${label.padEnd(34)} ${median(ms).toFixed(0).padStart(8)} ms  (cold ${ms[0]!.toFixed(0)}, min ${Math.min(...ms).toFixed(0)}) ${digest}`,
	)
}

const sets: readonly [string, readonly Milestone[]][] = [
	["0 milestones", []],
	["1 balance", [balance]],
	["1 expense window", [window]],
	["3 (balance, window, accounts)", [balance, window, accounts]],
]
for (const [name, milestones] of sets) {
	const plan: Scenario = milestones.length === 0 ? scenario : { ...scenario, milestones }
	time(`${name}: chance ${PATHS}`, () =>
		chanceOfSuccess(baseline, plan, timeline, { model, seed: "0123456789abcdef", paths: PATHS }),
	)
	time(`${name}: fi survival`, () =>
		financialIndependence(baseline, plan, timeline, { method: "survival" }),
	)
	time(`${name}: fi probability ${FI_PATHS}`, () =>
		financialIndependence(
			baseline,
			plan,
			timeline,
			{
				method: "probabilityThreshold",
				thresholdBps: 8000,
				paths: FI_PATHS,
				seed: "0123456789abcdef",
			},
			model,
		),
	)
	time(`${name}: project`, () => project(baseline, plan, timeline))
}
