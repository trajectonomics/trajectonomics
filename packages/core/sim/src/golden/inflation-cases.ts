import { freelancer } from "../fixtures/freelancer"
import type { ParityCase } from "./parity-cases"

/** The freelancer with a 150-bps-a-year inflation swing and no volatile Account (ADR 0033). */
const swinging: ParityCase["fixture"] = {
	...freelancer,
	scenario: {
		...freelancer.scenario,
		economy: { inflation: freelancer.scenario.economy.inflation, inflationVolatility: 150 },
	},
}

const plan = { buckets: 256, seed: "0123456789abcdef", paths: 200 } as const

/** Cases that draw inflation per Market path, and one per-path replay of the same plan (ADR 0033). */
export const INFLATION_PARITY_CASES: readonly ParityCase[] = [
	{ name: "freelancer-plan-chance-inflation", fixture: swinging, plan },
	{ name: "freelancer-path-inflation", fixture: swinging, path: { ...plan, index: 7 } },
]
