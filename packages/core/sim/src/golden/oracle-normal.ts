/**
 * An independent derivation of the standard normal quantiles, in BigInt fixed point at 10^40. It
 * imports nothing, and shares no code or method with the engine's table: pi by Machin's formula,
 * exp by its Taylor series, the cdf by the all-positive series
 * `Phi(x) = 1/2 + phi(x) * sum x^(2n+1) / (2n+1)!!`, and the quantile by bisection.
 */
const ONE = 10n ** 40n

function isqrt(value: bigint): bigint {
	if (value < 2n) return value
	let guess = 1n << BigInt((value.toString(2).length + 1) >> 1)
	for (;;) {
		const next = (guess + value / guess) >> 1n
		if (next >= guess) return guess
		guess = next
	}
}

function arctanInverse(x: bigint): bigint {
	let power = ONE / x
	let sum = power
	for (let k = 1n; power !== 0n; k++) {
		power = power / (x * x)
		sum += (k % 2n === 1n ? -1n : 1n) * (power / (2n * k + 1n))
	}
	return sum
}

const PI = 16n * arctanInverse(5n) - 4n * arctanInverse(239n)
const SQRT_TWO_PI = isqrt(2n * PI * ONE)

/** exp(-t) for t >= 0 in fixed point, by its alternating Taylor series. */
function expNegative(t: bigint): bigint {
	let term = ONE
	let sum = ONE
	for (let n = 1n; term !== 0n; n++) {
		term = (term * t) / (ONE * n)
		sum += n % 2n === 1n ? -term : term
	}
	return sum
}

/** The cdf at `x` >= 0 (fixed point), as a fraction of ONE. */
function cdf(x: bigint): bigint {
	const density = (expNegative((x * x) / (2n * ONE)) * ONE) / SQRT_TWO_PI
	let power = x
	let sum = x
	for (let n = 1n; power !== 0n; n++) {
		power = (power * ((x * x) / ONE)) / (ONE * (2n * n + 1n))
		sum += power
	}
	return ONE / 2n + (density * sum) / ONE
}

/**
 * The quantile z > 0 at probability `numerator / denominator` (above one half), as an integer
 * number of 10^-12: the largest x with cdf(x) <= p, found by bisection.
 */
export function oracleQuantileTrillionths(numerator: bigint, denominator: bigint): bigint {
	const target = (numerator * ONE) / denominator
	let low = 0n
	let high = 6n * 10n ** 12n
	while (high - low > 1n) {
		const middle = (low + high) / 2n
		if (cdf(middle * 10n ** 28n) <= target) low = middle
		else high = middle
	}
	return low
}

/** `trillionths` rounded half up to millionths. */
export function roundToMillionths(trillionths: bigint): bigint {
	return (trillionths + 500_000n) / 1_000_000n
}

/** The distance, in trillionths, from `trillionths` to the nearest rounding boundary (a .5 millionth). */
export function distanceToBoundary(trillionths: bigint): bigint {
	const remainder = trillionths % 1_000_000n
	const gap = remainder > 500_000n ? remainder - 500_000n : 500_000n - remainder
	return gap
}

/** The half table for `buckets`: the quantiles at the upper half's midpoints, ascending, in trillionths. */
export function oracleHalfTable(buckets: number): readonly bigint[] {
	const count = BigInt(buckets)
	const half: bigint[] = []
	for (let bucket = count / 2n; bucket < count; bucket++) {
		half.push(oracleQuantileTrillionths(2n * bucket + 1n, 2n * count))
	}
	return half
}
