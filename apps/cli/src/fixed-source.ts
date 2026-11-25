import type { Source } from "./store/types"

/**
 * The one test-only variable of the fixed source (cli ADR-0074): `<instant>#<seed>`, such as
 * `2026-10-31T00:00:00.000Z#1000000`. The instant is the clock's only reading, and the seed is the
 * first value of the counter that makes up the random part of each UUIDv7 id. Only `demo-entry.ts`
 * reads it, so a shipped `traj` (built from `index.ts`) neither contains nor honours it.
 */
export const FIXED_SOURCE_VARIABLE = "TRAJ_FIXED_SOURCE"

/** The random part of a UUIDv7 id after its variant bits: 62 bits. */
const SEED_LIMIT = 1n << 62n

const SHAPE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)#(\d{1,19})$/

/** Hex of `value`, padded on the left to `width` digits. */
function hex(value: bigint, width: number): string {
	return value.toString(16).padStart(width, "0")
}

/**
 * A UUIDv7 with the time part `at` and `counter` as its 62 random bits. The version is 7 and the
 * variant is `10`, so it is a valid UUIDv7 that sorts by `at` first and by `counter` after it.
 */
export function counterId(at: Date, counter: bigint): string {
	const time = hex(BigInt(at.getTime()), 12)
	const tail = hex((1n << 63n) | counter, 16)
	return `${time.slice(0, 8)}-${time.slice(8)}-7000-${tail.slice(0, 4)}-${tail.slice(4)}`
}

/**
 * The fixed source a value names, or `undefined` when it is not `<instant>#<seed>`: the instant
 * must be an ISO instant that reads back the same, and the seed a decimal number below 2^62. The
 * clock always answers the instant, and each id takes the next counter from the seed on, so a run
 * given the same value writes the same ids in the same order.
 */
export function parseFixedSource(value: string): Source | undefined {
	const match = SHAPE.exec(value)
	if (match === null) return undefined
	const instant = new Date(match[1] ?? "")
	const seed = BigInt(match[2] ?? "")
	const valid =
		!Number.isNaN(instant.getTime()) &&
		instant.toISOString() === match[1] &&
		instant.getTime() >= 0 &&
		instant.getTime() < 2 ** 48 &&
		seed < SEED_LIMIT
	if (!valid) return undefined
	let next = seed
	return {
		clock: () => new Date(instant),
		newId: (at) => {
			if (next >= SEED_LIMIT) throw new Error("the fixed source ran out of ids")
			const id = counterId(at, next)
			next += 1n
			return id
		},
	}
}
