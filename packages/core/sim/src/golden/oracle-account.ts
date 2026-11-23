import type { Fixture } from "../fixtures/fixture"
import type { DateString } from "../types"

/** The year, the month and the day of an ISO date, as numbers. */
function parts(date: DateString): readonly [number, number, number] {
	const [year = 0, month = 0, day = 0] = date.split("-").map(Number)
	return [year, month, day]
}

/**
 * The whole years from `from` to `date`, which must be an anniversary of `from`. Actual/365 No Leap
 * counts exactly 365 days a year between anniversaries, so their growth is one exact power.
 */
function anniversaryYears(from: DateString, date: DateString): number {
	const [fromYear, fromMonth, fromDay] = parts(from)
	const [year, month, day] = parts(date)
	if (month !== fromMonth || day !== fromDay || year < fromYear) {
		throw new Error(`${date} is not an anniversary of ${from}`)
	}
	return year - fromYear
}

/** A non-negative quotient rounded half up, computed exactly: floor((2n + d) / 2d). */
function roundedHalfUp(numerator: bigint, denominator: bigint): bigint {
	return (2n * numerator + denominator) / (2n * denominator)
}

/**
 * An Account that no Flow changes, valued at an anniversary of the Timeline start: the opening
 * balance times (10000 + rate) to the years, over 10000 to the same years, rounded half up once.
 */
export function oracleAccountAt(fixture: Fixture, account: string, date: DateString): bigint {
	const rule = fixture.scenario.accounts.find((item) => item.id === account)
	if (rule === undefined) throw new Error(`No Account ${account}`)
	const opening = fixture.baseline.balances.find((item) => item.account === account)?.amount ?? 0
	const years = anniversaryYears(fixture.timeline.start, date)
	let numerator = BigInt(opening)
	for (let year = 0; year < years; year++) numerator *= BigInt(10000 + rule.rate)
	return roundedHalfUp(numerator, 10000n ** BigInt(years))
}
