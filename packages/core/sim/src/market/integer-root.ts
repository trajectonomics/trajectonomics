/** The floor of the square root of a non-negative BigInt, by Newton's method. */
export function isqrt(value: bigint): bigint {
	if (value < 2n) return value
	let guess = 1n << BigInt((value.toString(2).length + 1) >> 1)
	for (;;) {
		const next = (guess + value / guess) >> 1n
		if (next >= guess) return guess
		guess = next
	}
}

/** Floor division of BigInts: rounds toward negative infinity, whatever the signs. */
export function floorDiv(numerator: bigint, denominator: bigint): bigint {
	const quotient = numerator / denominator
	return numerator % denominator !== 0n && numerator < 0n !== denominator < 0n
		? quotient - 1n
		: quotient
}
