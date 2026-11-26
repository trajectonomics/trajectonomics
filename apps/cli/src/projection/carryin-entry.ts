import type { MonthDay } from "@trajectonomics/core/sim"
import { type AppError, isAppError } from "../errors"
import type { JsonRecord } from "../scenario/tax/json"
import type { CarryInRecordForm } from "./carryin"
import { type CarryInClass, type StatedTally, withAllClasses } from "./carryin-classes"
import { alignedStart, amountsOf, storedTallies } from "./carryin-record"
import { flagProblem, storedProblem, unreadable } from "./carryin-refuse"
import type { CarryInSource } from "./carryin-view"

/** One Carry-in record resolved into minor units, ready to place in a Levy and echo. */
export type CarryInEntry = {
	periodStart: string
	tallies: StatedTally[]
	/** The classes the record itself stated; a shared-loan fill reads the rest from the other Return. */
	stated: ReadonlySet<string>
	/** The classes the record left to `rest`'s zero: it asserts they tallied nothing. */
	rested: ReadonlySet<string>
	prepaid: number
	source: CarryInSource
}

/** One `--carry-in` record: its period aligned, its amounts parsed, its classes complete. */
export function flagEntry(input: {
	record: CarryInRecordForm
	index: number
	levy: string
	classes: readonly CarryInClass[]
	fillable: ReadonlySet<string>
	currency: string
	period: MonthDay | undefined
}): CarryInEntry | AppError {
	const base = `document.${input.index}`
	const periodStart = alignedStart({
		value: input.record.periodStart,
		period: input.period,
		path: `${base}.periodStart`,
		levy: input.levy,
	})
	if (isAppError(periodStart)) return periodStart
	const amounts = amountsOf(input.record, base, input.currency)
	if (isAppError(amounts)) return amounts
	const tallies = withAllClasses(
		amounts.stated,
		input.classes,
		amounts.rest,
		(problem) => flagProblem(problem, { base, levy: input.levy, periodStart }),
		input.fillable,
	)
	if (isAppError(tallies)) return tallies
	return {
		periodStart,
		tallies: tallies.tallies,
		stated: tallies.stated,
		rested: tallies.rested,
		prepaid: amounts.prepaid,
		source: "flag",
	}
}

/** One stored `levy.carryIn` record, resolved by the same class rule as the flag's. */
export function storedEntry(input: {
	record: JsonRecord
	levy: string
	classes: readonly CarryInClass[]
	fillable: ReadonlySet<string>
	path: string
	period: MonthDay | undefined
}): CarryInEntry | AppError {
	const at = input.record["periodStart"]
	if (typeof at !== "string") return unreadable(input.path, input.levy, "at", "no period start")
	const periodStart = alignedStart({
		value: at,
		period: input.period,
		path: input.path,
		levy: input.levy,
	})
	if (isAppError(periodStart)) return periodStart
	const stated = storedTallies(input.record, input.path, input.levy, at)
	if (isAppError(stated)) return stated
	const prepaid = input.record["prepaid"]
	if (typeof prepaid !== "number") {
		return unreadable(input.path, input.levy, at, "no prepaid amount")
	}
	const tallies = withAllClasses(
		stated,
		input.classes,
		false,
		(problem) => storedProblem(problem, { path: input.path, levy: input.levy, periodStart }),
		input.fillable,
	)
	if (isAppError(tallies)) return tallies
	return {
		periodStart,
		tallies: tallies.tallies,
		stated: tallies.stated,
		rested: tallies.rested,
		prepaid,
		source: "document",
	}
}
