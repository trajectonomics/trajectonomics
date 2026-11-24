import { describe, expect, it } from "bun:test"
import { isAppError } from "../errors"
import { fromDecimalForm } from "./decimal"
import { type Doc, decimalOk, isDoc, withAmount, worked } from "./decimal-test-support"
import { moneyPathsOf, PUBLISHED, ratePathsOf } from "./money-fields"
import { scenarioTemplate } from "./template"

/** The values a money path names, as `flows[].amount` reads them; a list is walked item by item. */
function valuesAt(value: unknown, segments: readonly string[]): unknown[] {
	const [head, ...rest] = segments
	if (head === undefined) return [value]
	const listed = head.endsWith("[]")
	const key = listed ? head.slice(0, -2) : head
	if (!isDoc(value)) return []
	const child = value[key]
	if (!listed) return valuesAt(child, rest)
	return Array.isArray(child) ? child.flatMap((item) => valuesAt(item, rest)) : []
}

describe("the money fields of the decimal form", () => {
	it("are exactly the fields the published schema marks as minor units", () => {
		// A new money field fails here until it is reviewed for the decimal form (ADR-0047).
		expect(moneyPathsOf(PUBLISHED)).toEqual([
			"flows[].amount",
			"flows[].level.principal",
			"flows[].rule.floor.amount",
			"flows[].rule.ceiling.amount",
			"milestones[].criteria[].amount",
			"cashflow.surplus[].upTo",
			"estate.costs[].amount",
			"estate.gifts[].amount",
		])
	})

	it("write a spending rule's rates, an estate share and an Account's payout and fee, and no other rate, as percent strings", () => {
		// A new rate field fails here until it is reviewed for the decimal form (cli ADR-0063, ADR-0064, ADR-0067).
		expect(ratePathsOf(PUBLISHED)).toEqual([
			"accounts[].payout.bps",
			"accounts[].fee.bps",
			"flows[].rule.rateBps",
			"flows[].rule.steps[].bps",
			"flows[].rule.upper.bps",
			"flows[].rule.upper.adjustBps",
			"flows[].rule.lower.bps",
			"flows[].rule.lower.adjustBps",
			"estate.costs[].bps",
			"estate.gifts[].bps",
		])
	})

	for (const path of moneyPathsOf(PUBLISHED)) {
		it(`converts every ${path} both ways, and no other field`, () => {
			const minor = worked()
			const decimal = decimalOk(minor)
			const segments = path.split(".")
			const minorValues = valuesAt(minor, segments)
			expect(minorValues.length).toBeGreaterThan(0)
			// A list item may omit an optional money field; the values that are there are strings.
			for (const value of valuesAt(decimal, segments)) {
				if (value !== undefined) expect(typeof value).toBe("string")
			}
			const back = fromDecimalForm(decimal)
			expect(back).toEqual(minor)
		})
	}

	it("round-trips the worked example, the template and their money exactly", () => {
		const example = worked()
		expect(fromDecimalForm(decimalOk(example))).toEqual(example)
		const template: unknown = JSON.parse(scenarioTemplate() ?? "null")
		if (!isDoc(template)) throw new Error("the template is not a document")
		expect(fromDecimalForm(decimalOk(template))).toEqual(template)
	})

	it("leaves rates and counts as integers", () => {
		const decimal = decimalOk(worked())
		expect(decimal["accounts"]).toEqual([
			{ id: "cash", kind: "asset", rate: 150 },
			{ id: "index", kind: "asset", rate: 600, compounding: "annual" },
			{ id: "pension", kind: "asset", rate: 400, lockedUntil: "2051-01-01" },
			{ id: "loan", kind: "liability", rate: 500, compounding: "monthly" },
			{ id: "car", kind: "liability", rate: 600, compounding: "monthly" },
			{ id: "home", kind: "asset", rate: 300, liquid: false },
			{ id: "home-loan", kind: "liability", rate: 500, compounding: "monthly" },
		])
		expect(decimal["economy"]).toEqual({ inflation: 300 })
	})

	it("writes minor units at the currency's full scale", () => {
		const decimal = decimalOk(withAmount(worked(), 900_050))
		expect((decimal["flows"] as Doc[])[0]?.["amount"]).toBe("9000.50")
	})
})

describe("reading a decimal amount", () => {
	const decimalBase = decimalOk(worked())
	const amountOf = (value: unknown): unknown => {
		const minor = fromDecimalForm(withAmount(decimalBase, value))
		if (isAppError(minor)) return minor
		return ((minor as Doc)["flows"] as Doc[])[0]?.["amount"]
	}

	it('turns "9000.50" into 900050 and "0.1" into 10', () => {
		expect(amountOf("9000.50")).toBe(900_050)
		expect(amountOf("0.1")).toBe(10)
	})

	it("converts a negative amount, leaving the core to refuse it", () => {
		expect(amountOf("-5.00")).toBe(-500)
	})

	it('refuses "1.005" at its path as INVALID_AMOUNT, never rounding it', () => {
		const error = fromDecimalForm(withAmount(decimalBase, "1.005"))
		expect(isAppError(error)).toBe(true)
		if (!isAppError(error)) return
		expect(error.body.code).toBe("INVALID_AMOUNT")
		expect(error.body.exitCode).toBe(3)
		expect(error.body.path).toBe("document.flows.salary.amount")
	})

	it("refuses a JSON number at its path, and says what to write instead", () => {
		const error = fromDecimalForm(withAmount(decimalBase, 9000.5))
		expect(isAppError(error)).toBe(true)
		if (!isAppError(error)) return
		expect(error.body.code).toBe("invalid_input")
		expect(error.body.exitCode).toBe(2)
		expect(error.body.path).toBe("document.flows.salary.amount")
		expect(error.body.hint).toContain('"350.00"')
	})

	it('refuses grouping commas as invalid input, "9,000.50"', () => {
		const error = fromDecimalForm(withAmount(decimalBase, "9,000.50"))
		expect(isAppError(error) && error.body.code).toBe("invalid_input")
		expect(isAppError(error) && error.body.path).toBe("document.flows.salary.amount")
	})

	for (const text of ["abc", "1e3", "+5.00", ".5", ""]) {
		it(`refuses ${JSON.stringify(text)} as invalid input`, () => {
			const error = fromDecimalForm(withAmount(decimalBase, text))
			expect(isAppError(error) && error.body.code).toBe("invalid_input")
		})
	}

	it("refuses a document with no currency before it reads any field", () => {
		const { currency: _currency, ...rest } = worked()
		const error = fromDecimalForm(rest)
		expect(isAppError(error) && error.body.code).toBe("unsupported_currency")
		expect(isAppError(error) && error.body.path).toBe("document.currency")
	})

	it("refuses a currency other than THB, as unsupported_currency", () => {
		const error = fromDecimalForm({ ...worked(), currency: "USD" })
		expect(isAppError(error) && error.body.code).toBe("unsupported_currency")
	})
})
