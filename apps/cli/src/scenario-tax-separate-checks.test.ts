import { describe, expect, it } from "bun:test"
import { couple, coupleHousehold, TWO_SALARIES, taxCouple } from "./scenario-tax-filers-support"
import { LABELS } from "./scenario-tax-separate-support"
import { errorOf, resultOf, scenario } from "./scenario-test-support"
import { SENTENCES } from "./sentences"

/* What a separate filing refuses before it writes (cli ADR-0075). */

const TOO_BIG = "99999999999999999999"

/** The couple's two salaries and a loan, which the household may say both own. */
const LOAN_PLAN = {
	...TWO_SALARIES,
	accounts: [
		...(TWO_SALARIES["accounts"] as unknown[]),
		{ id: "loan", kind: "liability", rate: 0 },
	],
}

const owners = (loan: string) =>
	coupleHousehold([
		{ path: "flows.salary", person: "me" },
		{ path: "flows.partner-salary", person: "partner" },
		{ path: "accounts.loan", person: loan },
	])

describe("a value too large to keep", () => {
	it.each([
		["--parents", "9007199254740993"],
		["--children", TOO_BIG],
		["--children", "9007199254740991"],
		["--children-at-higher-rate", "partner=9007199254740991"],
		["--disabled-care", "9007199254740991"],
		["--disabled-care", `partner=${TOO_BIG}`],
		["--life-insurance", TOO_BIG],
		["--donation1x", "9".repeat(400)],
	])("is refused at %s, and the plan stays readable", async (flag, value) => {
		const home = await couple(TWO_SALARIES, coupleHousehold())
		const res = await taxCouple(home, "married_separate", LABELS, [flag, value])
		expect(res.code, res.out).toBe(2)
		expect(errorOf(res)).toMatchObject({ path: flag, message: SENTENCES.range })
		expect((await scenario(home, ["show", "base"])).code).toBe(0)
	})
})

describe("counts that are too large only together", () => {
	it("are refused at the last of their flags", async () => {
		const home = await couple(TWO_SALARIES, coupleHousehold())
		const children = ["--children", "1501199875", "--children-at-higher-rate", "1501199875"]
		const disabled = ["--disabled-care", "1001199874"]
		const refused = { path: "--disabled-care", message: SENTENCES.range }
		const res = await taxCouple(home, "married_separate", LABELS, [...children, ...disabled])
		expect(res.code, res.out).toBe(2)
		expect(errorOf(res)).toMatchObject(refused)
		expect((await taxCouple(home, "married_separate", LABELS, children)).code).toBe(0)
		const merged = await scenario(home, ["tax", "base", "--merge", ...disabled])
		expect(errorOf(merged)).toMatchObject(refused)
	})
})

describe("the check across two separate Returns", () => {
	it.each([
		[["--parents", "4"], "me"],
		[["--parents", "partner=3"], "partner"],
	])("refuses more than a Filer's own two parents: %p", async (extra, person) => {
		const home = await couple(TWO_SALARIES, coupleHousehold())
		const res = await taxCouple(home, "married_separate", LABELS, extra)
		expect(res.code, res.out).toBe(2)
		expect(errorOf(res)).toMatchObject({
			path: "--parents",
			details: { problem: "OWN_PARENTS_OVER_TWO", persons: [person] },
		})
	})

	it("refuses a joint Return's four parents when the plan turns separate", async () => {
		const home = await couple(TWO_SALARIES, coupleHousehold())
		expect((await taxCouple(home, "married_joint", LABELS, ["--parents", "4"])).code).toBe(0)
		const res = await scenario(home, [
			"tax",
			"base",
			"--merge",
			"--filing-status",
			"married_separate",
		])
		expect(errorOf(res)).toMatchObject({ path: "--parents" })
	})
})

describe("interest on two separate Returns beside a loan both own", () => {
	const PATH = "allowances.mortgageInterestCeiling"
	const interest = (me: string, partner: string) => [
		"--mortgage-interest",
		me,
		"--mortgage-interest",
		`partner=${partner}`,
	]

	/** The write's assumptions about the home-loan ceiling. */
	async function assumed(loan: string, claims: readonly string[]) {
		const home = await couple(LOAN_PLAN, owners(loan))
		const res = await taxCouple(home, "married_separate", LABELS, claims)
		expect(res.code, res.err).toBe(0)
		const found = resultOf(res).assumptions as { path: string; note: string }[]
		return found.filter((it) => it.path === PATH)
	}

	it("is accepted, and the result says it takes the loans to be separate", async () => {
		const [entry, ...more] = await assumed("shared", interest("80000", "80000"))
		expect(more).toEqual([])
		expect(entry).toMatchObject({ value: 100000, status: "reported" })
		expect(entry?.note).toContain("separate loans")
		expect(entry?.note).toContain("--mortgage-interest shared=<amount>")
	})

	it.each([
		["no loan is shared", "me", interest("80000", "80000")],
		["one Return states interest", "shared", ["--mortgage-interest", "80000"]],
		[
			"the shared loan's interest is stated as such",
			"shared",
			[...interest("80000", "80000"), "--mortgage-interest", "shared=20000"],
		],
	])("says nothing of it when %s", async (_when, loan, claims) => {
		const found = await assumed(loan, claims)
		expect(found.map((it) => it.note).join()).not.toContain("separate loans")
	})
})
