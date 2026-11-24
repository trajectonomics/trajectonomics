import { describe, expect, test } from "bun:test"
import type { ScenarioDocument, TaxProfile } from "../../contract"
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

const flow = (id: string, kind: string, label?: string) => ({
	id,
	kind,
	frequency: "monthly",
	start: "2026-01-01",
	...(label === undefined ? {} : { label }),
})
const plan = (...flows: ReturnType<typeof flow>[]) =>
	({ currency: "THB", accounts: [], flows }) as unknown as ScenarioDocument

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
	test("lists each class the profile leaves out, in the CLI's order, each with its place", () => {
		const missing = notStated(profile, plan())
		expect(missing.map((one) => one.class)).toEqual([
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
		])
		expect(missing[0]).toEqual({ class: "parents", label: "Parents you support", place: "family" })
		expect(missing.find((one) => one.class === "mortgageInterest")?.place).toBe("home")
		expect(missing.find((one) => one.class === "thaiEsg")?.place).toBe("flows")
	})

	test("a count or an amount of zero states nothing, and children are stated by a count above zero", () => {
		const none = notStated({ ...profile, children: 0, lifeInsurance: 0 }, plan())
		expect(none.map((one) => one.class)).toContain("children")
		expect(none.map((one) => one.class)).toContain("lifeInsurance")
		const stated = notStated(profile, plan()).map((one) => one.class)
		expect(stated).not.toContain("children")
		expect(stated).not.toContain("lifeInsurance")
		expect(stated).not.toContain("donation1x")
	})

	test("a labelled contribution Flow states its class: ThaiESG on its own, any other label as retirement", () => {
		const rmf = notStated(profile, plan(flow("rmf", "contribution", "allowance.retirement.rmf")))
		expect(rmf.map((one) => one.class)).not.toContain("retirementContributions")
		expect(rmf.map((one) => one.class)).toContain("thaiEsg")
		const esg = notStated(profile, plan(flow("esg", "contribution", "allowance.thai_esg")))
		expect(esg.map((one) => one.class)).not.toContain("thaiEsg")
		expect(esg.map((one) => one.class)).toContain("retirementContributions")
		const bare = notStated(
			profile,
			plan(flow("save", "contribution"), flow("pay", "income", "allowance.thai_esg")),
		)
		expect(bare.map((one) => one.class)).toContain("retirementContributions")
		expect(bare.map((one) => one.class)).toContain("thaiEsg")
	})

	test("a profile that states every flag leaves only the classes a Flow states", () => {
		const full: TaxProfile = {
			...profile,
			parents: 1,
			disabledCare: 1,
			socialSecurity: 9000,
			healthInsurance: 1,
			parentHealthInsurance: 1,
			spouseLifeInsurance: 1,
			mortgageInterest: 1,
			donation2x: 1,
		}
		expect(notStated(full, plan()).map((one) => one.class)).toEqual([
			"retirementContributions",
			"thaiEsg",
		])
	})
})
