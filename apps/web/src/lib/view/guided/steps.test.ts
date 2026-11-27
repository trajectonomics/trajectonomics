import { describe, expect, test } from "bun:test"
import type { PersonDraft } from "../household/person-draft"
import type { MoneyView } from "./money"
import { AMOUNT_PROBLEM, draftsOf, KEEP_PROBLEM, type RowDrafts } from "./money-draft"
import { blankPerson, HOLDER_REQUIRED, nameChange } from "./people"
import { type GuidedDraft, nextOf, previousOf, problemsOf, STEPS } from "./steps"

const MONEY: MoneyView = {
	path: "history",
	rows: [
		{
			id: "salary",
			name: "Salary",
			type: "income",
			frequency: "monthly",
			amount: "50000.00",
		},
	],
	leftOut: [],
	totals: { income: "50000.00", spending: "20000.00" },
	monthsCovered: 12,
}

const TOTALS: MoneyView = { ...MONEY, path: "totals", rows: [] }

const HOLDER: PersonDraft = {
	name: "me",
	displayLabel: "Me",
	role: "holder",
	relation: "",
	born: "1990-06",
	lifeExpectancy: "90",
	joins: "",
}

/** The draft a test changes, on the history path by default. */
function draft(over: Partial<GuidedDraft> = {}): GuidedDraft {
	return {
		money: MONEY,
		people: [HOLDER],
		rows: draftsOf(MONEY.rows),
		totals: { income: "40000", spending: "18000.50" },
		name: "guided",
		age: "60",
		stored: ["base"],
		...over,
	}
}

/** The rows with one row's answer changed. */
function rowsChanged(rows: RowDrafts, id: string, answer: Partial<RowDrafts[string]>): RowDrafts {
	return { ...rows, [id]: { ...(rows[id] ?? { keep: true, amount: "", earned: true }), ...answer } }
}

describe("the steps", () => {
	test("asks the household, the money and the stop age, in that order", () => {
		expect(STEPS).toEqual(["household", "money", "stop"])
		expect(nextOf("household")).toBe("money")
		expect(nextOf("stop")).toBeNull()
		expect(previousOf("stop")).toBe("money")
		expect(previousOf("household")).toBeNull()
	})
})

describe("problemsOf", () => {
	test("holds the household on a person whose fields are not filled", () => {
		const problems = problemsOf("household", draft({ people: [blankPerson("holder")] }))
		expect(problems).toContain("Enter a name for the person.")
		expect(problems).toContain("Enter the birth month as YYYY-MM.")
		expect(problems).toContain("Enter the age at which life ends, as a whole number.")
	})

	test("holds the household when no person is the holder", () => {
		const partner = {
			...{ ...blankPerson("partner"), ...nameChange("Ann") },
			born: "1992-01",
			lifeExpectancy: "88",
		}
		expect(problemsOf("household", draft({ people: [partner] }))).toContain(HOLDER_REQUIRED)
	})

	test("lets a filled household go on", () => {
		expect(problemsOf("household", draft())).toEqual([])
	})

	test("states an amount problem at the row that cannot be sent", () => {
		const rows = rowsChanged(draftsOf(MONEY.rows), "salary", { amount: "five thousand" })
		expect(problemsOf("money", draft({ rows }))).toEqual([AMOUNT_PROBLEM])
	})

	test("stops a money step whose every row is dropped", () => {
		const rows = rowsChanged(draftsOf(MONEY.rows), "salary", { keep: false })
		expect(problemsOf("money", draft({ rows }))).toEqual([KEEP_PROBLEM])
	})

	test("leaves a dropped row's amount out of the problems, because it is not sent", () => {
		const rows = rowsChanged(draftsOf(MONEY.rows), "salary", {
			keep: false,
			amount: "not an amount",
		})
		expect(problemsOf("money", draft({ rows }))).toEqual([KEEP_PROBLEM])
	})

	test("requires both totals on the short path", () => {
		const empty = { income: "", spending: "" }
		expect(problemsOf("money", draft({ money: TOTALS, totals: empty }))).toEqual([
			AMOUNT_PROBLEM,
			AMOUNT_PROBLEM,
		])
		expect(
			problemsOf(
				"money",
				draft({ money: TOTALS, totals: { income: "40000", spending: "18000.50" } }),
			),
		).toEqual([])
	})

	test("holds the stop step on a name the ledger already holds", () => {
		expect(problemsOf("stop", draft())).toEqual([])
		expect(problemsOf("stop", draft({ name: "base" }))).toEqual([
			"A plan named base already exists.",
		])
		expect(problemsOf("stop", draft({ name: "" }))).toEqual(["Enter a name for the plan."])
	})

	test("holds the stop step on an age at or past the holder's life expectancy", () => {
		expect(problemsOf("stop", draft({ age: "" }))).toEqual(["Enter the age in whole years."])
		expect(problemsOf("stop", draft({ age: "90" }))).toEqual([
			"Choose an age before your life expectancy (90).",
		])
	})
})
