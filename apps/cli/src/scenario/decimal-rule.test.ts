import { describe, expect, it } from "bun:test"
import { isAppError } from "../errors"
import { fromDecimalForm } from "./decimal"
import { type Doc, decimalOk, worked } from "./decimal-test-support"

describe("a spending rule in the decimal form", () => {
	const rule = (doc: unknown, id: string): Doc => {
		const flow = ((doc as Doc)["flows"] as Doc[]).find((entry) => entry["id"] === id)
		return (flow as Doc)["rule"] as Doc
	}

	it("prints each rate as a percent string and each bound as major units, exactly", () => {
		const decimal = decimalOk(worked())
		expect(rule(decimal, "bounded-spending")).toEqual({
			kind: "currentRate",
			portfolio: ["cash", "index"],
			rateBps: "4.50",
			rounding: "halfUp",
			steps: [
				{ from: "2040-01-01", bps: "5.00" },
				{ from: "2050-01-01", bps: "6.25" },
			],
			floor: { amount: "1200.00", growth: "inflation" },
			ceiling: { amount: "90000.50", growth: { bps: 0 } },
		})
		expect(rule(decimal, "retirement-spending")).toMatchObject({
			kind: "guardrails",
			rateBps: "4.00",
			upper: { bps: "20.00", adjustBps: "10.00" },
			lower: { bps: "20.00", adjustBps: "10.00" },
		})
	})

	it("leaves a bound's growth as the integer basis points it is", () => {
		const ceiling = rule(decimalOk(worked()), "bounded-spending")["ceiling"] as Doc
		expect(ceiling["growth"]).toEqual({ bps: 0 })
	})

	it("round-trips every rate, every basis point from 1 to 10000 included", () => {
		for (const bps of [1, 9, 10, 99, 100, 101, 400, 9_999, 10_000]) {
			const minor = worked()
			const flows = minor["flows"] as Doc[]
			const bounded = flows.find((flow) => flow["id"] === "bounded-spending") as Doc
			;(bounded["rule"] as Doc)["rateBps"] = bps
			expect(fromDecimalForm(decimalOk(minor)), String(bps)).toEqual(minor)
		}
	})

	/** The worked document in decimal form with the bounded rule's `rateBps` replaced. */
	function withRate(value: unknown): unknown {
		const decimal = decimalOk(worked())
		const flows = decimal["flows"] as Doc[]
		const bounded = flows.find((flow) => flow["id"] === "bounded-spending") as Doc
		return {
			...decimal,
			flows: flows.map((flow) =>
				flow === bounded
					? { ...bounded, rule: { ...(bounded["rule"] as Doc), rateBps: value } }
					: flow,
			),
		}
	}

	it('reads "4.5" as 450 and "0.01" as 1, with trailing zeros past two places allowed', () => {
		const rateOf = (value: unknown): unknown => {
			const minor = fromDecimalForm(withRate(value))
			return isAppError(minor) ? minor : rule(minor, "bounded-spending")["rateBps"]
		}
		expect(rateOf("4.5")).toBe(450)
		expect(rateOf("0.01")).toBe(1)
		expect(rateOf("4.500")).toBe(450)
		expect(rateOf("100")).toBe(10_000)
	})

	it('refuses "4.005" at its path, never rounding it to a basis point', () => {
		const error = fromDecimalForm(withRate("4.005"))
		expect(isAppError(error)).toBe(true)
		if (!isAppError(error)) return
		expect(error.body.code).toBe("invalid_input")
		expect(error.body.path).toBe("document.flows.bounded-spending.rule.rateBps")
		expect(error.body.message).toContain("more than 2 decimal places")
		expect(error.body.hint).toContain('"4.00"')
	})

	it("refuses a JSON number, grouping and text that is not a percent, at the rate's path", () => {
		for (const value of [4, 0.045, "1,0.00", "abc", "1e1", "+4.00", ".5", ""]) {
			const error = fromDecimalForm(withRate(value))
			expect(isAppError(error) && error.body.code, JSON.stringify(value)).toBe("invalid_input")
			expect(isAppError(error) && error.body.path).toBe(
				"document.flows.bounded-spending.rule.rateBps",
			)
		}
	})
})
