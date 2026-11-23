// Times chance of success, FI and project on a 30-year monthly Scenario with 0, 1 and 3 metric
// Milestones that never fire, so each is evaluated on every date. Run: bun run bench:milestones
// Prints the median of RUNS CPU times per row, in ms (the machine is shared, so wall time is not
// comparable between runs), and the size of each result, which must not change between versions.
// RUNS, PATHS (chance of success) and FI_PATHS (probability FI) are read from the environment.

import { thaiEmployee } from "../src/fixtures/thai-employee"
import { chanceOfSuccess, financialIndependence, project } from "../src/index"
import type { Milestone, ReturnModel, Scenario } from "../src/types"

const RUNS = Number(process.env.RUNS ?? 5)
const PATHS = Number(process.env.PATHS ?? 200)
const FI_PATHS = Number(process.env.FI_PATHS ?? 4)
const { baseline, scenario, timeline } = thaiEmployee
const never = 900_000_000_000_000

const balance: Milestone = {
	id: "rich",
	combine: "all",
	criteria: [
		{ id: "c", kind: "metric", metric: "netWorth", op: "atLeast", amount: never, terms: "nominal" },
	],
}
const window: Milestone = {
	id: "covered",
	combine: "all",
	criteria: [
		{
			id: "c",
			kind: "multiple",
			metric: "accessibleNetWorth",
			op: "atLeast",
			base: { expenses: "next12Months" },
			num: 1_000_000,
			den: 1,
			terms: "real",
		},
	],
}
const accounts: Milestone = {
	id: "funded",
	combine: "any",
	criteria: [
		{
			id: "c",
			kind: "metric",
			metric: { accounts: ["rmf", "emergency-fund"] },
			op: "atLeast",
			amount: never,
			terms: "nominal",
		},
	],
}
const model: ReturnModel = {
	id: "bench",
	accounts: scenario.accounts.map((account) => account.id),
	buckets: [
		{ returnsBps: [20, 40, 110, 0], weight: 3221225472 },
		{ returnsBps: [-40, -60, -120, 0], weight: 1073741824 },
	],
}

function median(values: number[]): number {
	return [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!
}

function time(label: string, run: () => unknown): void {
	const ms: number[] = []
	let digest = ""
	for (let index = 0; index < RUNS; index++) {
		const started = process.cpuUsage()
		digest = JSON.stringify(run()).length.toString()
		const used = process.cpuUsage(started)
		ms.push((used.user + used.system) / 1000)
	}
	console.log(
		`${label.padEnd(34)} ${median(ms).toFixed(0).padStart(8)} ms  (min ${Math.min(...ms).toFixed(0)}) ${digest}`,
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
