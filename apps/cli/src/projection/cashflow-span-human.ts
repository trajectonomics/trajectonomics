import { monthBlocks } from "./cashflow-month-human"
import { yearBlocks } from "./cashflow-year-human"

/*
 * `--breakdown-years` and `--breakdown-months`'s human view (cli ADR-0086). A person reads one block per
 * Reporting year and one table of months per year; the six long tables are JSON's and are hidden. Every
 * figure is a section total the JSON states or the exact sum of the span's own lines, never a roll-up
 * field, because a Reporting span has none.
 */

/** The year blocks and month tables of a result, or nothing when neither Reporting flag was given. */
export function reportingBlocks(data: Record<string, unknown>): string[] {
	const currency = String(data["currency"])
	return [...yearBlocks(data, currency), ...monthBlocks(data)]
}
