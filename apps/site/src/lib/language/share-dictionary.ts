/**
 * The share image's keys of the Dictionary: the short month names, the label under the date and the
 * picture in words. They live in their own interface, like the live Demo's, so `dictionary.ts` stays
 * under the one-file line limit; `Dictionary` extends this one, so every Language still carries them.
 */
export interface ShareWords {
	/** The twelve short month names a share image writes a date with, January first. */
	readonly shareMonths: readonly string[]
	/** The label under the date on the home share image: what the orange part of the line means. */
	readonly shareFreeLabel: string
	/** The home share image's picture in words, with `{date}` and `{free}` filled when it is built. */
	readonly shareChartAlt: string
}
