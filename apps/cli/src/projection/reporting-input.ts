import { type ReportingOptions, reportingYearRange, type Timeline } from "@trajectonomics/core/sim"
import { type AppError, fail, isAppError } from "../errors"

/*
 * The three flags that ask for a Reporting year or month breakdown (cli ADR-0086), translated to the
 * engine's `options.reporting` and checked before it runs so each refusal names the flag. The year
 * range is the engine's own `reportingYearRange`, so the CLI copies no calendar rule.
 */

export type ReportingInput = {
	breakdownYears: boolean
	breakdownMonths?: string | undefined
	yearStart?: number | undefined
}

const YEAR_START_HINT =
	"A Reporting year starts on the 1st of this month; 1 makes it the calendar year."

const NEEDS_HINT = "Add --breakdown-years for a breakdown per Reporting year, or drop --year-start."

const NAME_HINT = "Name a Reporting year by the calendar year it begins in."

/** `--year-start` as a month number: a whole number from 1 to 12, or the refusal that names the flag. */
function monthOf(input: number): number | AppError {
	if (Number.isInteger(input) && input >= 1 && input <= 12) return input
	return fail("invalid_input", {
		path: "yearStart",
		message: `--year-start: ${input} is not a month number. Give 1 (January) to 12 (December).`,
		hint: YEAR_START_HINT,
	})
}

/** The year `--breakdown-months` names, or the refusal: `first`, `all` or one four-digit year. */
function monthsOf(value: string): number | "first" | "all" | AppError {
	if (value === "first" || value === "all") return value
	if (!/^\d{4}$/.test(value)) return monthsRefusal(value)
	return Number(value)
}

function monthsRefusal(value: string): AppError {
	return fail("invalid_input", {
		path: "breakdownMonths",
		message: `--breakdown-months: ${JSON.stringify(value)} is not first, all or a year such as 2027.`,
		hint: NAME_HINT,
	})
}

/** The refusal for a year outside the Projection, or nothing: the range is the Reporting year of the As-of to that of the horizon. */
function yearOutside(year: number, timeline: Timeline, yearStart: number): AppError | undefined {
	const range = reportingYearRange(timeline, yearStart)
	if (range === undefined || (year >= range.first && year <= range.last)) return undefined
	return fail("invalid_input", {
		path: "breakdownMonths",
		message: `--breakdown-months: ${year} is outside this Projection, whose Reporting years run from ${range.first} to ${range.last} (--year-start ${yearStart}).`,
		hint: `Give a year from ${range.first} to ${range.last}, or move --horizon.`,
	})
}

/** The refusal for a run that gave `--year-start` alone, or nothing when it gave neither flag. */
function nothingAsked(yearStart: number | undefined): undefined | AppError {
	if (yearStart === undefined) return undefined
	return fail("invalid_input", {
		path: "yearStart",
		message: "--year-start applies only with --breakdown-years or --breakdown-months.",
		hint: NEEDS_HINT,
	})
}

/** The value `--breakdown-months` names, or nothing when it was not given. */
function monthsValue(value: string | undefined): number | "first" | "all" | undefined | AppError {
	return value === undefined ? undefined : monthsOf(value)
}

/** The refusal for a year outside the Projection, or nothing: `first` and `all` name no year. */
function outsideOf(
	months: number | "first" | "all",
	timeline: Timeline,
	yearStart: number,
): AppError | undefined {
	return typeof months === "number" ? yearOutside(months, timeline, yearStart) : undefined
}

/** The month a Reporting year begins in: January when the flag was not given, else `monthOf`. */
function startOf(value: number | undefined): number | AppError {
	return value === undefined ? 1 : monthOf(value)
}

/** The options object, with a key only for what the caller asked for. */
function optionsFor(
	yearStart: number,
	years: boolean,
	months: number | "first" | "all" | undefined,
): ReportingOptions {
	return {
		yearStart,
		...(years ? { years: true } : {}),
		...(months === undefined ? {} : { monthsOf: months }),
	}
}

/**
 * The engine's Reporting options for the flags given, or nothing when neither breakdown flag asks for
 * one, so a run without them keeps its bytes. Checked in the order ADR-0086 states, first failure
 * wins, and every key written is one the caller set: no key is ever `undefined`.
 */
export function reportingOptionsOf(
	input: ReportingInput,
	timeline: Timeline,
): ReportingOptions | undefined | AppError {
	const start = startOf(input.yearStart)
	if (isAppError(start)) return start
	if (!input.breakdownYears && input.breakdownMonths === undefined) {
		return nothingAsked(input.yearStart)
	}
	const months = monthsValue(input.breakdownMonths)
	if (isAppError(months)) return months
	const outside = months === undefined ? undefined : outsideOf(months, timeline, start)
	return outside ?? optionsFor(start, input.breakdownYears, months)
}
