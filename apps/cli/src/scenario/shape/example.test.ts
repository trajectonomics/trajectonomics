import { describe, expect, it } from "bun:test"
import { INITIAL_RATE_FLOW } from "./description"
import { EMPLOYER_FLOW, PAYOUT_ACCOUNT } from "./example-income"
import { scenarioExample, scenarioShapeDescription } from "./index"
import { nodeAt, type Path, refusalsOf, VERSION } from "./testing"

/*
 * The two things a person reads before writing a document: the unit of every number, and one
 * document that uses them. The example is the shape's `examples[0]`, so it is the same text
 * `traj schema scenario apply` prints.
 */

type Account = {
	id?: string
	kind?: string
	compounding?: string
	lockedUntil?: string
	liquid?: boolean
}
type Rule = {
	kind?: string
	portfolio?: string[]
	upper?: unknown
	lower?: unknown
	rounding?: string
	rateBps?: number
}
type Flow = {
	id?: string
	kind?: string
	growth?: unknown
	level?: unknown
	funding?: string
	source?: string
	derive?: { measures: { id?: string; op: string; account?: string }[] }
	end?: string
	start: string
}

const EXAMPLE = scenarioExample(VERSION ?? 0) as {
	accounts: Account[]
	flows: Flow[]
	cashflow: { surplus: { account: string }[]; contribute: string[]; withdraw: string[] }
}

describe("the unit of every number the shape states", () => {
	it("is named in the description of the field that holds it", () => {
		const units: [Path, string][] = [
			[["flows", 0, "amount"], "minor units"],
			[["cashflow", "surplus", 0, "upTo"], "minor units"],
			[["accounts", 0, "rate"], "basis points"],
			[["economy", "inflation"], "basis points"],
			[["flows", 0, "growth"], "bps"],
			[["flows", "*", "rule", "rateBps"], "basis points"],
			[["flows", "*", "rule", "floor", "amount"], "minor units"],
			[["flows", "*", "rule", "steps", "*", "bps"], "basis points"],
			[["flows", "*", "rule", "upper", "adjustBps"], "basis points"],
		]
		for (const [path, unit] of units) {
			expect(String(nodeAt(path)["description"])).toContain(unit)
		}
	})
})

describe("the worked example", () => {
	it("is a document the pin accepts, stamped with the version the pin takes", () => {
		expect(refusalsOf(EXAMPLE)).toEqual([])
		expect(EXAMPLE).toMatchObject({ schemaVersion: VERSION })
	})

	it("teaches every kind, every rate form and both growth forms", () => {
		const kinds = EXAMPLE.accounts.map((account) => account.kind)
		expect(kinds).toContain("asset")
		expect(kinds).toContain("liability")
		expect(EXAMPLE.accounts.some((account) => account.compounding !== undefined)).toBe(true)
		expect(EXAMPLE.accounts.some((account) => account.lockedUntil !== undefined)).toBe(true)
		const flows = EXAMPLE.flows.map((flow) => flow.kind)
		expect(flows).toEqual(
			expect.arrayContaining(["income", "expense", "contribution", "withdrawal"]),
		)
		// The loan's level payment is the one Flow that states `level` rather than `amount`.
		expect(EXAMPLE.flows.some((flow) => flow.level !== undefined)).toBe(true)
		expect(EXAMPLE.flows.map((flow) => flow.growth)).toEqual(
			expect.arrayContaining(["inflation", { bps: 200 }]),
		)
		expect(EXAMPLE.cashflow.surplus.length).toBeGreaterThan(0)
		expect(EXAMPLE.cashflow.contribute.length).toBeGreaterThan(0)
		expect(EXAMPLE.cashflow.withdraw.length).toBeGreaterThan(0)
	})
})

describe("the worked example's home", () => {
	const flow = (id: string): Flow => {
		const found = EXAMPLE.flows.find((entry) => entry.id === id)
		if (found === undefined) throw new Error(`the example has no ${id} Flow`)
		return found
	}

	it("is an illiquid asset Account that no routing list names", () => {
		const home = EXAMPLE.accounts.find((account) => account.id === "home")
		expect(home).toMatchObject({ kind: "asset", liquid: false })
		const routed = [
			...EXAMPLE.cashflow.surplus.map((step) => step.account),
			...EXAMPLE.cashflow.contribute,
			...EXAMPLE.cashflow.withdraw,
		]
		expect(routed).not.toContain("home")
	})

	it("is bought by an obligation, financed by a loan drawn that day, sold by a withdrawal, and its loan repaid from the sale", () => {
		const purchase = flow("home-purchase")
		expect(purchase).toMatchObject({ kind: "contribution", funding: "obligation" })
		expect(flow("home-loan-draw")).toMatchObject({ source: "home-loan", start: purchase.start })
		expect(flow("home-loan-payment").level).toBeDefined()
		expect(flow("home-sale")).toMatchObject({ kind: "withdrawal", source: "home" })
		const sale = flow("home-sale").start
		expect(flow("home-loan-payoff")).toMatchObject({
			kind: "contribution",
			target: "home-loan",
			start: sale,
		})
		expect((flow("home-loan-payment").end ?? "9999-12-31") < sale).toBe(true)
	})

	it("reads the home's value for its running cost and its sale, and ends both before the sale", () => {
		for (const id of ["home-running", "home-sale", "home-loan-payoff"]) {
			expect(flow(id).derive?.measures).toContainEqual({
				id: "value",
				op: "account",
				account: "home",
			})
		}
		const sale = flow("home-sale").start
		for (const id of ["home-running", "home-rent"]) {
			expect((flow(id).end ?? "9999-12-31") < sale).toBe(true)
		}
	})

	it("is described, in the document's prose, as composed with no rate or share of traj's", () => {
		const prose = scenarioShapeDescription("0.0.0")
		expect(prose).toContain("no model of its own")
		expect(prose).toContain("`traj` ships none")
	})
})

describe("the worked example's retirement spending", () => {
	const flow = (id: string): Flow & { startAt?: string; endAt?: string; rule?: Rule } => {
		const found = EXAMPLE.flows.find((entry) => entry.id === id)
		if (found === undefined) throw new Error(`the example has no ${id} Flow`)
		return found
	}

	it("is a guardrails rule gated by the retirement Milestone, over liquid assets", () => {
		const spending = flow("retirement-spending")
		expect(spending).toMatchObject({ kind: "expense", startAt: "retire" })
		expect(spending.rule?.kind).toBe("guardrails")
		for (const id of spending.rule?.portfolio ?? []) {
			const account = EXAMPLE.accounts.find((entry) => entry.id === id)
			expect(account).toMatchObject({ kind: "asset" })
			expect(account?.liquid).not.toBe(false)
		}
		expect(spending.rule?.upper).toBeDefined()
		expect(spending.rule?.lower).toBeDefined()
	})

	it("ends the salary, the rent and the monthly investment at the same Milestone", () => {
		for (const id of ["salary", "rent", "invest"]) expect(flow(id).endAt).toBe("retire")
	})

	it("states its rounding and every rate, and the document says `traj` ships none", () => {
		const { rule } = flow("retirement-spending")
		expect(rule?.rounding).toBe("floor")
		expect(typeof rule?.rateBps).toBe("number")
		const prose = scenarioShapeDescription("0.0.0")
		expect(prose).toContain("is the caller's own, and `traj` ships none")
		expect(prose).toContain('growth: "inflation"')
	})

	it("also teaches the initialRate form, in a Flow the pin accepts beside the example's Accounts", () => {
		expect(refusalsOf({ ...EXAMPLE, flows: [...EXAMPLE.flows, INITIAL_RATE_FLOW] })).toEqual([])
		expect(scenarioShapeDescription("0.0.0")).toContain(JSON.stringify(INITIAL_RATE_FLOW))
	})

	it("also teaches a payout, a fee and an employer's share, in documents the pin accepts beside the example", () => {
		const taught = {
			...EXAMPLE,
			accounts: [...EXAMPLE.accounts, PAYOUT_ACCOUNT],
			flows: [...EXAMPLE.flows, EMPLOYER_FLOW],
		}
		expect(refusalsOf(taught)).toEqual([])
		const prose = scenarioShapeDescription("0.0.0")
		expect(prose).toContain(JSON.stringify(PAYOUT_ACCOUNT))
		expect(prose).toContain(JSON.stringify(EMPLOYER_FLOW))
		expect(prose).toContain("every rate in them is the caller's")
	})
})
