/**
 * The test-only variable of the CLI's demo entry point (cli ADR 0074): `<instant>#<seed>-<limit>`. A binary built
 * from `src/index.ts` ignores it, so the other tests that build the Demo ledger are unchanged.
 */
const FIXED_SOURCE_VARIABLE = "TRAJ_FIXED_SOURCE"

/** The one instant the Demo ledger is written at: the Demo's own as-of date (`DEMO_INPUT.asOf`). */
export const DEMO_FIXED_INSTANT = "2026-10-31T00:00:00.000Z"

/**
 * The ids one `traj` call may mint. Each call is a new process, so its counter starts from its own seed
 * and the CLI stops it at the limit, the next call's seed: the ranges rise and never overlap.
 */
const SEED_STRIDE = 1_000_000

/** How many `traj` calls each ledger place has made, so the seed rises with every call. */
const calls = new WeakMap<object, number>()

/** The environment entry that fixes the next call of `place`: the instant, and a range above every earlier call's. */
export function nextFixedSource(place: object): Record<string, string> {
	const made = calls.get(place) ?? 0
	calls.set(place, made + 1)
	return {
		[FIXED_SOURCE_VARIABLE]: `${DEMO_FIXED_INSTANT}#${(made + 1) * SEED_STRIDE}-${(made + 2) * SEED_STRIDE}`,
	}
}
