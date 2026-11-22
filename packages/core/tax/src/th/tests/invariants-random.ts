/**
 * Seeded draws and a property runner for the Thai invariant tests.
 *
 * Purpose: Every generated case comes from one seed, so a run is identical each time and a failure
 * names the seed, the case index and the input that broke it.
 * Math: mulberry32, a 32-bit generator with a 2^32 period; draws are uniform in [0, 1).
 * Units: None; the generator returns plain numbers that callers scale to THB.
 */
export interface SeededRandom {
	/** Uniform integer in the inclusive range [min, max]. */
	readonly int: (min: number, max: number) => number
	/** True with probability 1 / oneIn. */
	readonly bool: (oneIn: number) => boolean
	/** Uniform element of a non-empty list. */
	readonly pick: <T>(items: readonly T[]) => T
}

/**
 * Creates a deterministic generator from a 32-bit seed.
 *
 * Purpose: The only source of randomness in the invariant tests; never `Math.random`.
 * Math: mulberry32 step, then a uniform draw `u` in [0, 1) that `int` maps onto the range.
 * Units: Dimensionless.
 *
 * @param seed Any integer; the same seed yields the same sequence.
 */
export function seededRandom(seed: number): SeededRandom {
	let state = seed >>> 0
	const next = (): number => {
		state = (state + 0x6d2b79f5) >>> 0
		let t = state
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
	return {
		int: (min, max) => min + Math.floor(next() * (max - min + 1)),
		bool: (oneIn) => Math.floor(next() * oneIn) === 0,
		pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)] as T,
	}
}

/**
 * Runs one property over `cases` seeded inputs and reports the first failure with its seed.
 *
 * Purpose: Turns a violated invariant into a reproducible report: seed, case index and input.
 * Math: Case `i` is the `i`-th draw from `seededRandom(seed)`, in order, so it depends only on seed.
 * Units: Depends on the generator.
 * Throws: Error naming the property, seed, case index and JSON input when the property throws.
 *
 * @param name Property name shown on failure.
 * @param seed Seed for the generator.
 * @param cases Number of generated inputs.
 * @param generate Builds one input from the seeded generator.
 * @param property Asserts the invariant for one input; throws when it does not hold.
 */
export function forAllSeeded<T>(
	name: string,
	seed: number,
	cases: number,
	generate: (rng: SeededRandom) => T,
	property: (input: T) => void,
): void {
	const rng = seededRandom(seed)
	for (let index = 0; index < cases; index++) {
		const input = generate(rng)
		try {
			property(input)
		} catch (error) {
			const reason = error instanceof Error ? error.message : String(error)
			throw new Error(
				`${name} violated: seed=${seed} case=${index} input=${JSON.stringify(input)}\n${reason}`,
			)
		}
	}
}
