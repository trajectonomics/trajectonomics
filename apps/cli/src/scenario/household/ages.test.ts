import { describe, expect, it } from "bun:test"
import { ageOn, agesOn } from "./ages"
import type { Household, Person } from "./model"

/** The holder: born June 1990, life expectancy 90. Age 60 falls on 2050-06-30 (ADR-0048). */
const HOLDER: Person = { id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 }
/** Born February 1992: age 60 falls on 2052-02-29, a leap day. */
const PARTNER: Person = {
	id: "partner",
	role: "partner",
	born: "1992-02",
	lifeExpectancy: 90,
	joins: "2028-01",
}
const CHILD: Person = {
	id: "child",
	role: "dependent",
	relation: "child",
	born: "2030-06",
	lifeExpectancy: 90,
}

describe("a person's age on a date", () => {
	it("is still 59 the day before the 60th birthday and 60 on the birthday", () => {
		expect(ageOn(HOLDER, "2050-06-29")).toBe(59)
		expect(ageOn(HOLDER, "2050-06-30")).toBe(60)
		expect(ageOn(HOLDER, "2050-07-01")).toBe(60)
	})

	it("turns on a leap day for a February birth, and not the day before", () => {
		expect(ageOn(PARTNER, "2052-02-28")).toBe(59)
		expect(ageOn(PARTNER, "2052-02-29")).toBe(60)
	})

	it("is 59 on 2051-02-28, the non-leap year's last February day", () => {
		expect(ageOn(PARTNER, "2051-02-27")).toBe(58)
		expect(ageOn(PARTNER, "2051-02-28")).toBe(59)
	})

	it("has no age before the last day of the birth month, so a newborn is absent until then", () => {
		expect(ageOn(HOLDER, "1990-06-29")).toBeNull()
		expect(ageOn(HOLDER, "1990-06-30")).toBe(0)
	})

	it("keeps counting past life expectancy, because the rule states no cap", () => {
		expect(ageOn(HOLDER, "2080-06-29")).toBe(89)
		expect(ageOn(HOLDER, "2080-06-30")).toBe(90)
		expect(ageOn(HOLDER, "2081-06-30")).toBe(91)
	})
})

describe("the household's ages on a date", () => {
	const household: Household = {
		schemaVersion: 1,
		people: [HOLDER, PARTNER, CHILD],
		anchors: [],
	}

	it("is empty without a household, so the shape stays stable", () => {
		expect(agesOn(null, "2030-06-30")).toEqual([])
	})

	it("lists people in household order, with each age on the date", () => {
		expect(agesOn(household, "2030-06-30")).toEqual([
			{ person: "me", age: 40 },
			{ person: "partner", age: 38 },
			{ person: "child", age: 0 },
		])
	})

	it("leaves out a dependent born later, and includes them from the birth month's last day", () => {
		expect(agesOn(household, "2030-06-29").map((entry) => entry.person)).toEqual(["me", "partner"])
		expect(agesOn(household, "2030-06-30").map((entry) => entry.person)).toContain("child")
	})

	it("leaves a partner with joins out before the first day of that month, and includes them on it", () => {
		expect(agesOn(household, "2027-12-31").map((entry) => entry.person)).not.toContain("partner")
		expect(agesOn(household, "2028-01-01").map((entry) => entry.person)).toContain("partner")
	})

	it("keeps a partner without joins in the plan from the start", () => {
		const fromStart: Household = {
			schemaVersion: 1,
			people: [HOLDER, { ...PARTNER, joins: undefined }],
			anchors: [],
		}
		expect(agesOn(fromStart, "2026-01-01")).toEqual([
			{ person: "me", age: 35 },
			{ person: "partner", age: 33 },
		])
	})
})
