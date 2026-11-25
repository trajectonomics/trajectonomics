// Times a 1,000-path chance of success with and without `outcomes` (ADR 0011). Run: bun scripts/bench-outcomes.ts [day|month]

import { freelancer } from "../src/fixtures/freelancer"
import { freelancerChance } from "../src/golden/chance-cases"
import { chanceOfSuccess } from "../src/index"

const RUNS = 9
const resolution = Bun.argv[2] === "month" ? "month" : "day"
const { baseline, scenario } = freelancer
const timeline = { ...freelancer.timeline, resolution }
const base = { ...freelancerChance, paths: 1000 }

function time(outcomes: boolean): number {
	const started = Bun.nanoseconds()
	const result = chanceOfSuccess(baseline, scenario, timeline, { ...base, outcomes })
	if (!result.ok) throw new Error("the chance was refused")
	return (Bun.nanoseconds() - started) / 1e6
}

const median = (values: number[]): number => [...values].sort((a, b) => a - b)[values.length >> 1]!
time(false)
time(true)
const without: number[] = []
const withOutcomes: number[] = []
for (let run = 0; run < RUNS; run++) {
	without.push(time(false))
	withOutcomes.push(time(true))
}
const [off, on] = [median(without), median(withOutcomes)]
console.log(
	`1,000 paths at ${resolution} resolution, median of ${RUNS}: ${off.toFixed(1)} ms without, ${on.toFixed(1)} ms with outcomes`,
)
console.log(`overhead ${(((on - off) / off) * 100).toFixed(2)}%`)
