import { describe, expect, test } from "bun:test"
import type { HouseholdDocument } from "../../contract"
import { anchorRow, anchorTarget, anchorWords } from "./anchor"
import { itemLabel, itemNames, itemText, NO_ITEM_NAMES } from "./names"
import { personNames } from "./people"

const HOUSEHOLD: HouseholdDocument = {
	schemaVersion: 1,
	people: [
		{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 },
		{ id: "partner", role: "partner", born: "1992-02", lifeExpectancy: 88 },
		{ id: "mali", role: "dependent", relation: "child", born: "2027-09", lifeExpectancy: 90 },
		{ id: "gran", role: "dependent", relation: "parent", born: "1950-01", lifeExpectancy: 90 },
	],
	anchors: [],
}
const ACCOUNTS = new Map([["acct-1", "Bank"]])
const NAMES = itemNames(ACCOUNTS, HOUSEHOLD)

const DOCUMENT = {
	currency: "THB",
	accounts: [],
	flows: [
		{
			id: "salary",
			kind: "income" as const,
			frequency: "monthly" as const,
			start: "2026-01-01",
			displayLabel: "Salary",
		},
		{ id: "rent", kind: "expense" as const, frequency: "monthly" as const, start: "2026-01-01" },
	],
	milestones: [{ id: "car-paid-off", displayLabel: "Car paid off" }],
}
const LABELLED = itemNames(ACCOUNTS, HOUSEHOLD, DOCUMENT)

describe("a person is called by the role the household states", () => {
	test("the holder is You, a partner is Your partner, and a dependent is its relation", () => {
		expect(itemLabel(NAMES, "person", "me")).toMatchObject({ text: "You", named: true })
		expect(itemText(NAMES, "person", "partner")).toBe("Your partner")
		expect(itemText(NAMES, "person", "mali")).toBe("Child")
		expect(itemText(NAMES, "person", "gran")).toBe("Parent")
	})

	test("two people of one role take their id, so a page can tell them apart", () => {
		const twins: HouseholdDocument = {
			...HOUSEHOLD,
			people: [
				{ id: "mali", role: "dependent", relation: "child", born: "2027-09", lifeExpectancy: 90 },
				{ id: "pim", role: "dependent", relation: "child", born: "2029-01", lifeExpectancy: 90 },
			],
		}
		const names = personNames(twins)
		expect(names.get("mali")?.label).toBe("Child (mali)")
		expect(names.get("pim")?.label).toBe("Child (pim)")
	})

	test("a person the household does not hold shows by id, not named", () => {
		expect(itemLabel(NAMES, "person", "ghost")).toMatchObject({ text: "ghost", named: false })
		expect(itemLabel(NO_ITEM_NAMES, "person", "me")).toMatchObject({ text: "me", named: false })
	})
})

describe("an id no Read names shows as the id", () => {
	test("a Flow and a Milestone have no name in the CLI's output, so each is the id and unnamed", () => {
		expect(itemLabel(NAMES, "flow", "salary")).toMatchObject({ text: "salary", named: false })
		expect(itemLabel(NAMES, "milestone", "car-paid-off")).toMatchObject({
			text: "car-paid-off",
			named: false,
		})
	})

	test("a Flow and a Milestone show the label the document states, and the id when it states none", () => {
		expect(itemLabel(LABELLED, "flow", "salary")).toMatchObject({ text: "Salary", named: true })
		expect(itemLabel(LABELLED, "milestone", "car-paid-off")).toMatchObject({
			text: "Car paid off",
			named: true,
		})
		expect(itemLabel(LABELLED, "flow", "rent")).toMatchObject({ text: "rent", named: false })
		expect(itemLabel(LABELLED, "milestone", "unknown")).toMatchObject({
			text: "unknown",
			named: false,
		})
	})

	test("a person's displayLabel wins over the role words", () => {
		const household: HouseholdDocument = {
			...HOUSEHOLD,
			people: [{ ...HOUSEHOLD.people[0]!, displayLabel: "Somchai" }],
		}
		const names = itemNames(ACCOUNTS, household)
		expect(itemLabel(names, "person", "me")).toMatchObject({ text: "Somchai", named: true })
	})

	test("two items of one kind that share a label take their id, so a page can tell them apart", () => {
		const doc = {
			...DOCUMENT,
			flows: [
				{ ...DOCUMENT.flows[0]!, displayLabel: "Retirement" },
				{
					id: "pension",
					kind: "income" as const,
					frequency: "monthly" as const,
					start: "2026-01-01",
					displayLabel: "Retirement",
				},
				{ ...DOCUMENT.flows[1]!, displayLabel: "Rent" },
			],
			milestones: [
				{ id: "retire", displayLabel: "Retirement" },
				{ id: "retire-2", displayLabel: "Retirement" },
				{ id: "car-paid-off", displayLabel: "Car paid off" },
			],
		}
		const names = itemNames(ACCOUNTS, HOUSEHOLD, doc)
		expect(itemText(names, "milestone", "retire")).toBe("Retirement (retire)")
		expect(itemText(names, "milestone", "retire-2")).toBe("Retirement (retire-2)")
		expect(itemText(names, "milestone", "car-paid-off")).toBe("Car paid off")
		expect(itemText(names, "flow", "salary")).toBe("Retirement (salary)")
		expect(itemText(names, "flow", "pension")).toBe("Retirement (pension)")
		expect(itemText(names, "flow", "rent")).toBe("Rent")
	})

	test("a Flow and a Milestone may share a label: the twin count is per kind", () => {
		const doc = {
			...DOCUMENT,
			flows: [
				...DOCUMENT.flows,
				{
					id: "bonus",
					kind: "income" as const,
					frequency: "monthly" as const,
					start: "2026-01-01",
					displayLabel: "Freedom",
				},
			],
			milestones: [...DOCUMENT.milestones, { id: "freedom", displayLabel: "Freedom" }],
		}
		const names = itemNames(ACCOUNTS, HOUSEHOLD, doc)
		expect(itemText(names, "flow", "bonus")).toBe("Freedom")
		expect(itemText(names, "milestone", "freedom")).toBe("Freedom")
	})

	test("an Account is named by the ledger, and one only the plan has shows as the id", () => {
		expect(itemLabel(NAMES, "account", "acct-1")).toMatchObject({ text: "Bank", named: true })
		expect(itemLabel(NAMES, "account", "condo")).toMatchObject({ text: "condo", named: false })
	})

	test("an id is never turned into words: a kebab-case id is kept as it is", () => {
		expect(itemText(NAMES, "milestone", "net-worth-ten-million")).toBe("net-worth-ten-million")
	})
})

describe("anchors in words", () => {
	test("a path names its item and its date, or none when it has no words", () => {
		expect(anchorTarget("flows.fund.end")).toEqual({ kind: "flow", id: "fund", edge: "end" })
		expect(anchorTarget("accounts.joint.start")?.kind).toBe("account")
		expect(anchorTarget("flows.fund")).toBeNull()
		expect(anchorTarget("flows.fund.rate")).toBeNull()
		expect(anchorTarget("tax.year.end")).toBeNull()
	})

	test("the person reads as the household's words: an age, a life end and a joining", () => {
		const people = NAMES.people
		expect(anchorWords({ path: "flows.fund.end", person: "me", age: 60 }, people)).toBe(
			"at you, age 60",
		)
		expect(anchorWords({ path: "flows.fund.end", person: "me", at: "lifeEnd" }, people)).toBe(
			"at you, life end",
		)
		expect(anchorWords({ path: "flows.a.start", person: "partner", at: "joins" }, people)).toBe(
			"at your partner, joining",
		)
		expect(anchorWords({ path: "flows.school.start", person: "mali", age: 6 }, people)).toBe(
			"at the child, age 6",
		)
	})

	test("without the household's words the person is the id", () => {
		expect(anchorWords({ path: "flows.fund.end", person: "me", age: 60 })).toBe("at me, age 60")
	})

	test("a row holds the item, the date and a plain label, and a path with no words stays whole", () => {
		const row = anchorRow({ path: "flows.fund.end", person: "me", age: 60 }, NAMES)
		expect(row.target).toEqual({ kind: "flow", id: "fund", edge: "end" })
		expect(row.edge).toBe("ends")
		expect(row.when).toBe("at you, age 60")
		expect(row.plain).toBe("fund ends")
		const odd = anchorRow({ path: "tax.year.end", person: "me", age: 60 }, NAMES)
		expect(odd.target).toBeNull()
		expect(odd.plain).toBe("tax.year.end")
	})
})
