import type { DateString, SavingsOptions } from "../types"

/** Also hashes `contributionSavings` on the first Levy's Settlement period that starts on `period`. */
export interface ParitySavings {
	readonly period: DateString
	readonly options: SavingsOptions
}
