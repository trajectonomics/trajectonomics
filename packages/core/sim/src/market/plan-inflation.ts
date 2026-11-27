import type { InflationBucket, InflationFactor, Scenario } from "../types"
import { spanNumerator } from "./month-return"
import { wholeBasisPoints } from "./whole-bps"

const FLOOR = -9999n
const CEILING = 10_000n

export interface InflationFactorOutcome {
	/** Absent when the plan states no volatility, so inflation stays at the Scenario's one rate. */
	readonly factor?: InflationFactor
	/** How many buckets the model's range clamped. */
	readonly clamped: number
}

/**
 * The inflation factor a plan implies (ADR 0033): the Scenario's `inflation` as the mean and
 * `inflationVolatility` as the yearly standard deviation, over the same standard normal table as the
 * markets. Equal weights and an odd-symmetric table make the rates sum to exactly `buckets × mean`.
 */
export function inflationFactorOf(
	scenario: Scenario,
	z: readonly number[],
	weight: number,
): InflationFactorOutcome {
	const volatility = scenario.economy.inflationVolatility ?? 0
	if (volatility <= 0) return { clamped: 0 }
	const mean = BigInt(scenario.economy.inflation) * 10n ** 6n
	const spread = BigInt(volatility) * 10n ** 6n
	let clamped = 0
	const buckets: InflationBucket[] = wholeBasisPoints(
		z.map((quantile) => spanNumerator(mean, spread, quantile)),
	).map((value) => {
		const kept = value < FLOOR ? FLOOR : value > CEILING ? CEILING : value
		if (kept !== value) clamped++
		return { rateBps: Number(kept), weight }
	})
	return { factor: { buckets }, clamped }
}
