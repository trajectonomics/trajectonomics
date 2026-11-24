/** A rate's unit, repeated in every hint: the document states rates in basis points, never as a fraction. */
export const UNIT = "Write it in basis points, a whole number: 2% is 200 and 100% is 10000."

/** The sentence for a rate out of range and the way out, as `RATE_OUT_OF_RANGE` states them (cli ADR-0065). */
export type Entry = { message: string; hint: string }
