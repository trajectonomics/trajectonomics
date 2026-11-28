import { describe, expect, it } from "bun:test"
import { leapDay } from "./reporting-cases"
import { span } from "./reporting-check"
import { months, years } from "./reporting-projected"

/**
 * Case D, hand-worked: 100 lands on 29 February 2028 and 30 is drawn on 29 February, 29 March; the
 * 29 April rent is past the 15 April horizon. The leap day is the As-of, so its month is its own day.
 */
describe("case D: the leap day", () => {
	it("states a one-day February month, a whole March and a cut April", () => {
		expect(months(leapDay, 1, "all")).toEqual([
			span(2028, "2028-02-29", "2028-02-29", true, {
				income: [{ flow: "pay", amount: 100 }],
				expenses: [{ flow: "rent", amount: 30 }],
				categories: [{ category: null, amount: 30 }],
				surplus: [{ account: "cash", amount: 70 }],
			}),
			span(2028, "2028-03-01", "2028-03-31", false, {
				expenses: [{ flow: "rent", amount: 30 }],
				categories: [{ category: null, amount: 30 }],
				drawn: [{ account: "cash", amount: 30 }],
			}),
			span(2028, "2028-04-01", "2028-04-15", true),
		])
	})

	it("states the year 2028 whole from the leap day, and 2027 ending on 29 February", () => {
		expect(years(leapDay, 1)).toEqual([
			span(2028, "2028-02-29", "2028-04-15", true, {
				income: [{ flow: "pay", amount: 100 }],
				expenses: [{ flow: "rent", amount: 60 }],
				categories: [{ category: null, amount: 60 }],
				drawn: [{ account: "cash", amount: 30 }],
				surplus: [{ account: "cash", amount: 70 }],
			}),
		])
		expect(years(leapDay, 3)).toEqual([
			span(2027, "2028-02-29", "2028-02-29", true, {
				income: [{ flow: "pay", amount: 100 }],
				expenses: [{ flow: "rent", amount: 30 }],
				categories: [{ category: null, amount: 30 }],
				surplus: [{ account: "cash", amount: 70 }],
			}),
			span(2028, "2028-03-01", "2028-04-15", true, {
				expenses: [{ flow: "rent", amount: 30 }],
				categories: [{ category: null, amount: 30 }],
				drawn: [{ account: "cash", amount: 30 }],
			}),
		])
	})

	it("gives the February month of year 2027 for monthsOf first with a March year start", () => {
		expect(months(leapDay, 3, "first")).toEqual([
			span(2027, "2028-02-29", "2028-02-29", true, {
				income: [{ flow: "pay", amount: 100 }],
				expenses: [{ flow: "rent", amount: 30 }],
				categories: [{ category: null, amount: 30 }],
				surplus: [{ account: "cash", amount: 70 }],
			}),
		])
	})
})
