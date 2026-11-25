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

	const interest = (me: string, partner: string) => [
		"--mortgage-interest",
		me,
		"--mortgage-interest",
		`partner=${partner}`,
	]

	it("refuses interest over the ceiling on a loan both own", async () => {
		const home = await couple(LOAN_PLAN, owners("shared"))
		const res = await taxCouple(home, "married_separate", LABELS, interest("50000", "50000.01"))
		expect(res.code, res.out).toBe(2)
		expect(errorOf(res)).toMatchObject({
			path: "--mortgage-interest",
			details: { problem: "MORTGAGE_OVER_CEILING", persons: ["me", "partner"] },
		})
		const at = await taxCouple(home, "married_separate", LABELS, interest("50000", "50000"))
		expect(at.code, at.err).toBe(0)
	})

	it("accepts each Return's own interest when no loan is shared", async () => {
		const home = await couple(LOAN_PLAN, owners("me"))
		const res = await taxCouple(home, "married_separate", LABELS, interest("80000", "80000"))
		expect(res.code, res.err).toBe(0)
		expect(resultOf(res).levies).toHaveLength(2)
	})
})
