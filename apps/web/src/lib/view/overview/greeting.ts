import type { Snapshot } from "../../contract"
import { householdOf } from "../item-names/snapshot"
import { mainPlan } from "../plans/rows"

/** The holder's display label in the Snapshot's main plan, or null when the ledger or the household states none. */
function holderName(snapshot: Snapshot | null): string | null {
	if (snapshot === null) return null
	const household = householdOf(snapshot, mainPlan(snapshot))
	const holder = household?.people.find((person) => person.role === "holder")
	const label = holder?.displayLabel
	return label === undefined || label === "" ? null : label
}

/**
 * Home's title: who it greets, and the situation on the page. `months` is a signed whole-month offset from
 * the viewing date: 0 is now, a positive count looks ahead and a negative one looks back. A multiple of 12
 * is said in years. Every word is the household's or a fixed one.
 */
export function greetingOf(snapshot: Snapshot | null, months = 0): string {
	const name = holderName(snapshot)
	const hello = name === null ? "Hello there" : `Hello ${name}`
	if (months === 0) return `${hello}, this is your current situation`
	const count = Math.abs(months)
	const said = count % 12 === 0 ? years(count) : monthCount(count)
	return months > 0
		? `${hello}, this is where you'll be in ${said}`
		: `${hello}, this is where you were ${said} ago`
}

/** "1 month" or "3 months". */
function monthCount(count: number): string {
	return count === 1 ? "1 month" : `${count} months`
}

/** "1 year" or "2 years", for a count that is a whole number of years. */
function years(count: number): string {
	const whole = count / 12
	return whole === 1 ? "1 year" : `${whole} years`
}
