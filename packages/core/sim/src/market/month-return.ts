import type { CompoundingPeriod } from "../types"
import { floorDiv, isqrt } from "./integer-root"

/** One unit of a month return is a millionth of a basis point; a month factor is `(UNIT + m) / UNIT`. */
const UNIT = 10n ** 10n
const BPS = 10_000n
const PERIODS: Readonly<Record<CompoundingPeriod, bigint>> = {
	monthly: 12n,
	quarterly: 4n,
	semiannual: 2n,
	annual: 1n,
}

/** The yearly growth factor of a rate as a fraction: effective, or nominal compounded `n` times. */
function yearlyFactor(rate: bigint, compounding: CompoundingPeriod | undefined) {
	if (compounding === undefined) return { top: BPS + rate, bottom: BPS }
	const n = PERIODS[compounding]
	return { top: (BPS * n + rate) ** n, bottom: (BPS * n) ** n }
}

/**
 * The month return `m`, in millionths of a basis point, whose twelve-fold compounding is the
 * Account's yearly growth: the greatest `m` in (-UNIT, UNIT] with `(1 + m)^12 <= yearly factor`, by
 * integer bisection. A month cannot more than double, so a larger root saturates at +100%.
 */
export function monthReturn(rate: number, compounding: CompoundingPeriod | undefined): bigint {
	const { top, bottom } = yearlyFactor(BigInt(rate), compounding)
	const fits = (m: bigint) => (UNIT + m) ** 12n * bottom <= top * UNIT ** 12n
	let low = -UNIT
	let high = UNIT
	if (fits(high)) return high
	while (high - low > 1n) {
		const middle = floorDiv(low + high, 2n)
		if (fits(middle)) low = middle
		else high = middle
	}
	return low
}

/**
 * A yearly volatility scaled to a month, `volatility / sqrt(12)`, in millionths of a basis point,
 * rounded half up: `floor((floor(2 * sqrt(v^2 * 10^12 / 12)) + 1) / 2)`, all in integers.
 */
export function monthVolatility(volatility: number): bigint {
	const squared = BigInt(volatility) ** 2n * 10n ** 12n
	return (isqrt(squared / 3n) + 1n) / 2n
}

/** `m + z * s` before rounding, in units of 10^-12 bp: `z` is in millionths, `m` and `s` in millionths of a bp. */
export function spanNumerator(m: bigint, s: bigint, z: number): bigint {
	return m * 10n ** 6n + BigInt(z) * s
}
