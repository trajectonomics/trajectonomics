import { describe, expect, it } from "bun:test"
import { isAppError } from "../errors"
import { fromDecimalForm } from "./decimal"
import { type Doc, decimalOk, worked } from "./decimal-test-support"

describe("an estate block in the decimal form", () => {
	const estate = (doc: unknown): Doc => (doc as Doc)["estate"] as Doc

	it("prints each share as a percent string and each fixed amount in major units, exactly", () => {
		expect(estate(decimalOk(worked()))).toEqual({
			costs: [
				{ id: "settlement", of: "gross", bps: "1.00", rounding: "halfUp" },
				{ id: "home-selling", of: { accounts: ["home"] }, bps: "3.00", rounding: "ceil" },
				{ id: "lawyer", amount: "500.00", growth: "inflation" },
				{ id: "transfer-fee", amount: "200.00", growth: { bps: 0 } },
			],
			gifts: [
				{ id: "temple", of: "net", bps: "5.00", rounding: "floor" },
				{ id: "family", amount: "1000.00", growth: "inflation" },
			],
		})
	})

	it("round-trips the block exactly, every share from 1 to 10000 basis points included", () => {
		const minor = worked()
		expect(fromDecimalForm(decimalOk(minor))).toEqual(minor)
		for (const bps of [1, 9, 10, 99, 101, 9_999, 10_000]) {
			const doc = worked()
			const costs = estate(doc)["costs"] as Doc[]
			if (costs[0] !== undefined) costs[0]["bps"] = bps
			expect(fromDecimalForm(decimalOk(doc)), String(bps)).toEqual(doc)
		}
	})

	it("refuses a share with a third place, and a JSON number, at the share's path", () => {
		for (const value of ["1.005", 1, "abc"]) {
			const decimal = decimalOk(worked())
			const costs = estate(decimal)["costs"] as Doc[]
			if (costs[0] !== undefined) costs[0]["bps"] = value
			const error = fromDecimalForm(decimal)
			expect(isAppError(error) && error.body.code, String(value)).toBe("invalid_input")
			expect(isAppError(error) && error.body.path).toBe("document.estate.costs.settlement.bps")
		}
	})

	it("refuses a fixed amount with too many places, at the amount's path", () => {
		const decimal = decimalOk(worked())
		const gifts = estate(decimal)["gifts"] as Doc[]
		if (gifts[1] !== undefined) gifts[1]["amount"] = "1000.005"
		const error = fromDecimalForm(decimal)
		expect(isAppError(error) && error.body.path).toBe("document.estate.gifts.family.amount")
	})
})
