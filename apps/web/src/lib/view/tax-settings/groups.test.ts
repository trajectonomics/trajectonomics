import { describe, expect, test } from "bun:test"
import type { TaxProfile } from "../../contract"
import { TAX_FLAG_KEYS } from "../../edit/tax-flags"
import { GROUPS, groupCards, PLACE, TAX_CLASSES } from "./groups"
import { notStated } from "./not-stated"

const profile: TaxProfile = {
	tax: "th-2026",
	filingStatus: "married_joint",
	children: 2,
	childrenAtHigherRate: 1,
	lifeInsurance: 20000,
	donation1x: 5000,
}

describe("the groups of the stored request", () => {
	test("every item of the profile is in exactly one group, in the order the form lists them", () => {
		const items = GROUPS.flatMap((group) => group.items)
		expect([...items].sort()).toEqual([...TAX_FLAG_KEYS].sort())
		expect(GROUPS.map((group) => group.key)).toEqual([
			"filing",
			"family",
			"insurance",
			"home",
			"giving",
			"social",
		])
	})

	test("every class of the CLI has a place, and every card group has a class or is the filing status", () => {
		expect(Object.keys(PLACE).sort()).toEqual([...TAX_CLASSES].sort())
		const placed = new Set(Object.values(PLACE))
		for (const group of GROUPS) {
			if (group.key !== "filing") expect(placed.has(group.key)).toBe(true)
		}
		// A class sits in the group that holds its item.
		for (const klass of TAX_CLASSES) {
			const place = PLACE[klass]
			if (place === "flows") continue
			expect(GROUPS.find((group) => group.key === place)?.items).toContain(klass)
		}
	})

	test("the two retirement classes are stated by contribution Flows, so they are in no card", () => {
		expect(PLACE.retirementContributions).toBe("flows")
		expect(PLACE.thaiEsg).toBe("flows")
	})

	test("a card holds the rows of its own items as the page shows them", () => {
		const cards = groupCards(profile)
		expect(cards.map((card) => card.title)).toEqual([
			"Filing status",
			"Family",
			"Insurance",
			"Home",
			"Giving",
			"Social security",
		])
		const family = cards.find((card) => card.key === "family")
		expect(family?.rows.map((row) => row.key)).toEqual([
			"children",
			"childrenAtHigherRate",
			"parents",
			"disabledCare",
		])
		expect(family?.rows.map((row) => row.value)).toEqual(["2", "1", "None", "None"])
		const insurance = cards.find((card) => card.key === "insurance")
		expect(insurance?.rows.find((row) => row.key === "lifeInsurance")?.value).toBe("20,000 THB")
		expect(cards.find((card) => card.key === "home")?.rows.map((row) => row.value)).toEqual([
			"None",
		])
		expect(cards.flatMap((card) => card.rows)).toHaveLength(TAX_FLAG_KEYS.length)
	})
})

describe("what the plan does not state yet", () => {
	// What `scenario show` reports for the profile above and a plan with no contribution Flow.
	const reported = {
		stated: ["children", "lifeInsurance", "donation1x"],
		notStated: [
			"parents",
			"disabledCare",
			"socialSecurity",
			"healthInsurance",
			"parentHealthInsurance",
			"spouseLifeInsurance",
			"mortgageInterest",
			"donation2x",
			"retirementContributions",
			"thaiEsg",
		],
	}

	test("lists the classes `traj` reports, in its order, each with its words and its place", () => {
		const missing = notStated(reported)
		expect(missing.map((one) => one.class)).toEqual(reported.notStated)
		expect(missing[0]).toEqual({ class: "parents", label: "Parents you support", place: "family" })
		expect(missing.find((one) => one.class === "mortgageInterest")?.place).toBe("home")
		expect(missing.find((one) => one.class === "thaiEsg")).toEqual({
			class: "thaiEsg",
			label: "ThaiESG contributions",
			place: "flows",
		})
	})

	test("works out nothing of its own: a class `traj` calls stated is never listed, whatever the profile holds", () => {
		const missing = notStated({ stated: ["retirementContributions"], notStated: ["thaiEsg"] })
		expect(missing.map((one) => one.class)).toEqual(["thaiEsg"])
	})

	test("lists nothing when `traj` states no allowances, as for a plan with no stored profile", () => {
		expect(notStated(undefined)).toEqual([])
		expect(notStated({ stated: [], notStated: [] })).toEqual([])
	})

	test("a class a later `traj` reports is listed by its name with no place, and never throws", () => {
		expect(notStated({ stated: [], notStated: ["newClass", "toString"] })).toEqual([
			{ class: "newClass", label: "newClass", place: null },
			{ class: "toString", label: "toString", place: null },
		])
	})

	test("every class of the list the page knows has a label and a place", () => {
		const all = notStated({ stated: [], notStated: [...TAX_CLASSES] })
		expect(all.map((one) => one.place).includes(null)).toBe(false)
		expect(all.map((one) => one.label === one.class)).not.toContain(true)
	})
})
