import { describe, expect, it } from "bun:test"
import { ageDate, joinsDate } from "./dates"
import { ANCHORABLE, anchorableSegments } from "./paths"

describe("age to date", () => {
	it("puts age N on the last day of the birth month in year born + N", () => {
		expect(ageDate("1990-06", 60)).toBe("2050-06-30")
		expect(ageDate("1990-12", 0)).toBe("1990-12-31")
	})

	it("respects leap years, and century years that are not leap", () => {
		expect(ageDate("1992-02", 60)).toBe("2052-02-29")
		expect(ageDate("1992-02", 61)).toBe("2053-02-28")
		expect(ageDate("1900-02", 0)).toBe("1900-02-28")
		expect(ageDate("2000-02", 0)).toBe("2000-02-29")
	})

	it("keeps the first and last year the calendar allows", () => {
		expect(ageDate("0001-01", 0)).toBe("0001-01-31")
		expect(ageDate("9998-12", 0)).toBe("9998-12-31")
		expect(ageDate("9998-12", 1)).toBeNull()
		expect(ageDate("0001-01", -1)).toBeNull()
	})

	it("reads a partner's join month as its first day", () => {
		expect(joinsDate("2028-01")).toBe("2028-01-01")
		expect(joinsDate("9998-12")).toBe("9998-12-01")
	})
})

describe("anchorable paths", () => {
	it("are the date fields of id-addressed items the shape publishes", () => {
		expect(ANCHORABLE.map((pattern) => pattern.join("."))).toEqual([
			"accounts.*.lockedUntil",
			"flows.*.start",
			"flows.*.end",
			"milestones.*.criteria.*.on",
		])
	})

	it("reach a date criterion inside a Milestone, but not its other keys", () => {
		expect(anchorableSegments(["milestones", "retire", "criteria", "when", "on"])).toBe(true)
		expect(anchorableSegments(["milestones", "retire", "criteria", "wealth", "amount"])).toBe(false)
		expect(anchorableSegments(["milestones", "retire", "combine"])).toBe(false)
	})

	it("accept a field under an item's id and refuse any other", () => {
		expect(anchorableSegments(["flows", "salary", "end"])).toBe(true)
		expect(anchorableSegments(["accounts", "locked", "lockedUntil"])).toBe(true)
		expect(anchorableSegments(["flows", "salary", "amount"])).toBe(false)
		expect(anchorableSegments(["flows", "salary"])).toBe(false)
		expect(anchorableSegments(["calendar", "closed", "end"])).toBe(false)
	})
})
