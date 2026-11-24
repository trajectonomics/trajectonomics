import { describe, expect, test } from "bun:test"
import { DEMO } from "../what-if/fixtures.test-support"
import { account, CHART, sheetSnapshot } from "./fixtures.test-support"
import { addAgainstCommand, valueSheet } from "./sheet"

const sheet = () => {
	const built = valueSheet(sheetSnapshot())
	if (built === null) throw new Error("no sheet")
	return built
}

describe("the sheet's rows", () => {
	test("group the open asset Leaf Accounts by their top-level account, in tree order, and every debt under Debts", () => {
		const groups = sheet().groups.map((group) => [
			group.key,
			group.title,
			group.rows.map((r) => r.name),
		])
		expect(groups).toEqual([
			["cash-header", "Cash", ["Bank"]],
			["invest-header", "Investments", ["Index tracker"]],
			["thai-header", "ทรัพย์สิน", ["คอนโด"]],
			["assets", "Assets", ["Fund", "Home", "Mystery box"]],
			["debts", "Debts", ["Car Loan"]],
		])
	})

	test("read no word in a name: a Thai parent titles its group, and a leaf with no parent is under Assets", () => {
		const rows = sheet().groups.flatMap((group) => group.rows)
		expect(rows.find((row) => row.name === "คอนโด")?.id).toBe("condo")
		const deep = valueSheet(
			sheetSnapshot([
				account("a", "Emergency fund"),
				account("b", "Savings", { parentId: "a" }),
				account("c", "Pot", { parentId: "b" }),
			]),
		)
		expect(deep?.groups.map((group) => [group.key, group.title])).toEqual([["a", "Emergency fund"]])
	})

	test("leave out header accounts, archived accounts and every account that is not an asset or a debt", () => {
		const names = sheet().groups.flatMap((group) => group.rows.map((row) => row.name))
		for (const left of ["Cash", "Investments", "Old Loan", "Gains", "Rent", "Opening equity"]) {
			expect(names).not.toContain(left)
		}
	})

	test("read a group from the name of the account's parent when its own name says nothing", () => {
		const rows = sheet().groups.flatMap((group) => group.rows)
		expect(rows.find((row) => row.name === "Bank")?.id).toBe("bank")
		const nested = valueSheet(
			sheetSnapshot([account("cash", "Cash"), account("kb", "K Plus", { parentId: "cash" })]),
		)
		expect(nested?.groups.map((group) => group.key)).toEqual(["cash"])
	})

	test("carry the CLI's Balance as it states it, a debt negative, and the date of the last Transaction", () => {
		const rows = sheet().groups.flatMap((group) => group.rows)
		const named = (name: string) => rows.find((row) => row.name === name)
		expect(named("Bank")).toMatchObject({ balance: "1500.00", lastDate: "2026-10-30", owed: false })
		expect(named("Fund")).toMatchObject({ balance: "9000.00", lastDate: "2026-09-02" })
		expect(named("Car Loan")).toMatchObject({ balance: "-4000.00", lastDate: null, owed: true })
		expect(named("Home")).toMatchObject({ balance: null, lastDate: null })
	})

	test("say from when the loaded transactions run, so a missing date can be explained", () => {
		expect(sheet().since).toBe("2026-08-01")
		expect(sheet().asOf).toBe("2026-10-31")
	})
})

describe("the accounts to count against", () => {
	test("are the open income and equity Leaf Accounts", () => {
		expect(sheet().choices.map((choice) => choice.name)).toEqual(["Gains", "Opening equity"])
		expect(sheet().addCommands).toEqual([])
	})

	test("with none, the sheet holds the exact command that makes one, per currency", () => {
		const none = valueSheet(
			sheetSnapshot(CHART.filter((a) => a.type !== "income" && a.type !== "equity")),
		)
		expect(none?.choices).toEqual([])
		expect(none?.addCommands).toEqual([
			'traj account add "Valuation gains" --type income --currency THB',
		])
		expect(addAgainstCommand("USD")).toBe(
			'traj account add "Valuation gains" --type income --currency USD',
		)
	})
})

describe("the sheet of a Snapshot", () => {
	test("is none when the chart of accounts was not read", () => {
		const snapshot = sheetSnapshot()
		snapshot.reads.accounts = {
			argv: [],
			ok: false,
			error: { code: "x", exitCode: 1, message: "no" },
		}
		expect(valueSheet(snapshot)).toBeNull()
	})

	test("holds the Demo's accounts: Bank and Fund under Assets, Car Loan under Debts", () => {
		const demo = valueSheet(DEMO)
		expect(demo?.groups.map((group) => [group.key, group.rows.map((row) => row.name)])).toEqual([
			["assets", ["Bank", "Fund"]],
			["debts", ["Car Loan"]],
		])
		expect(demo?.choices.map((choice) => choice.name)).toContain("Fund Return")
	})
})
