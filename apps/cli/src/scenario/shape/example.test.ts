import { describe, expect, it } from "bun:test"
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

	it("is bought by an obligation, financed by a loan drawn that day, and sold by a withdrawal", () => {
		const purchase = flow("home-purchase")
		expect(purchase).toMatchObject({ kind: "contribution", funding: "obligation" })
		expect(flow("home-loan-draw")).toMatchObject({ source: "home-loan", start: purchase.start })
		expect(flow("home-loan-payment").level).toBeDefined()
		expect(flow("home-sale")).toMatchObject({ kind: "withdrawal", source: "home" })
	})

	it("reads the home's value for its running cost and its sale, and ends both before the sale", () => {
		for (const id of ["home-running", "home-sale"]) {
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
