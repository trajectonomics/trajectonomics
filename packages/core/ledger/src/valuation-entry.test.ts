import { describe, expect, it } from "bun:test"
import { chart, codeOf } from "./builders.fixtures"
import { balance, valuationEntry } from "./index"

const base = { id: "v1", date: "2026-03-01", against: "revenue" }
const moves = (account: string, balanceNow: number, value: number, against = "revenue") => {
	const entry = valuationEntry({ ...base, against, account, balance: balanceNow, value }, chart)
	return entry?.postings.map((p) => [p.accountId as string, p.amount])
}

describe("valuationEntry", () => {
	it("raises an asset to a higher value: Debit the asset, Credit the contra", () => {
		expect(moves("bank", 1000, 1500)).toEqual([
			["bank", 500],
			["revenue", -500],
		])
	})

	it("lowers an asset to a lower value: Credit the asset, Debit the contra", () => {
		expect(moves("bank", 1000, 400, "equity")).toEqual([
			["bank", -600],
			["equity", 600],
		])
	})

	it("states an asset's value on the Debit side, so an overdrawn asset moves from below zero", () => {
		expect(moves("bank", -250, 100)).toEqual([
			["bank", 350],
			["revenue", -350],
		])
	})

	it("states a liability's value as the amount owed: more owed is a Credit on the liability", () => {
		// The Balance is -800 (800 owed); stating 1000 owed moves it to -1000.
		expect(moves("principal", -800, 1000)).toEqual([
			["principal", -200],
			["revenue", 200],
		])
	})

	it("states a smaller amount owed as a Debit on the liability", () => {
		expect(moves("principal", -800, 300, "equity")).toEqual([
			["principal", 500],
			["equity", -500],
		])
	})

	it("returns nothing when the stated value equals the Balance", () => {
		expect(valuationEntry({ ...base, account: "bank", balance: 1000, value: 1000 }, chart)).toBe(
			undefined,
		)
		expect(
			valuationEntry({ ...base, account: "principal", balance: -800, value: 800 }, chart),
		).toBe(undefined)
	})

	it("leaves the account at exactly the stated value once the entry is added", () => {
		const entry = valuationEntry({ ...base, account: "principal", balance: 0, value: 700 }, chart)
		expect(balance([entry!], "principal", "2026-03-01", chart).amount).toBe(-700)
	})

	it("rejects a contra in another currency with CURRENCY_MISMATCH, even when the figures agree", () => {
		const input = { ...base, account: "baht", balance: 0, value: 5 }
		expect(codeOf(() => valuationEntry(input, chart))).toBe("CURRENCY_MISMATCH")
		expect(codeOf(() => valuationEntry({ ...input, value: 0 }, chart))).toBe("CURRENCY_MISMATCH")
	})

	it("reports an unknown account or contra as UNKNOWN_ACCOUNT", () => {
		const input = { ...base, account: "bank", balance: 0, value: 5 }
		expect(codeOf(() => valuationEntry({ ...input, account: "ghost" }, chart))).toBe(
			"UNKNOWN_ACCOUNT",
		)
		expect(codeOf(() => valuationEntry({ ...input, against: "ghost" }, chart))).toBe(
			"UNKNOWN_ACCOUNT",
		)
	})

	it("rejects a header account with NON_LEAF_ACCOUNT", () => {
		const input = { ...base, account: "assets", balance: 0, value: 5 }
		expect(codeOf(() => valuationEntry(input, chart))).toBe("NON_LEAF_ACCOUNT")
	})

	it("rejects a figure that is not a safe integer with INVALID_AMOUNT", () => {
		const input = { ...base, account: "bank", balance: 0, value: 1.5 }
		expect(codeOf(() => valuationEntry(input, chart))).toBe("INVALID_AMOUNT")
		expect(codeOf(() => valuationEntry({ ...input, value: 1, balance: Number.NaN }, chart))).toBe(
			"INVALID_AMOUNT",
		)
	})

	it("rejects a difference beyond the safe range with AMOUNT_OVERFLOW", () => {
		const input = {
			...base,
			account: "bank",
			balance: -Number.MAX_SAFE_INTEGER,
			value: Number.MAX_SAFE_INTEGER,
		}
		expect(codeOf(() => valuationEntry(input, chart))).toBe("AMOUNT_OVERFLOW")
	})

	it("keeps dimensions on the tagged leg only", () => {
		const entry = valuationEntry(
			{
				...base,
				account: { accountId: "bank", dimensions: { project: "home" } },
				balance: 0,
				value: 9,
			},
			chart,
		)
		expect(entry?.postings[0]?.dimensions).toEqual({ project: "home" })
		expect(entry?.postings[1]?.dimensions).toBeUndefined()
	})
})
