import { describe, expect, test } from "bun:test"

import type { AmountRow } from "../../contract"
import { accountGroups, type ListedAccount } from "./account-tree"

function account(
	overrides: Partial<ListedAccount> & Pick<ListedAccount, "id" | "name">,
): ListedAccount {
	return {
		type: "asset",
		currency: "THB",
		parentId: null,
		archivedAt: null,
		version: 1,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
		...overrides,
	}
}

function row(id: string, name: string, amount: string, type: AmountRow["type"]): AmountRow {
	return { account: { id, name }, type, amount, currency: "THB" }
}

const accounts: ListedAccount[] = [
	account({ id: "card", name: "Card", type: "liability" }),
	account({ id: "bank", name: "Bank" }),
	account({ id: "checking", name: "Checking", parentId: "bank" }),
	account({ id: "savings", name: "Savings", archivedAt: "2026-06-01T00:00:00.000Z" }),
	account({ id: "salary", name: "Salary", type: "income" }),
]

const rows: AmountRow[] = [
	row("checking", "Checking", "1500.00", "asset"),
	row("savings", "Savings", "0.00", "asset"),
	row("card", "Card", "-300.00", "liability"),
	row("salary", "Salary", "-2000.00", "income"),
]

describe("accountGroups", () => {
	test("lists the types that have accounts, in the order asset, liability, equity, income, expense", () => {
		const groups = accountGroups(accounts, rows)
		expect(groups.map((group) => group.type)).toEqual(["asset", "liability", "income"])
	})

	test("nests a child under its parent, one level deeper", () => {
		const [assets] = accountGroups(accounts, rows)
		expect(assets?.nodes.map((node) => [node.name, node.depth])).toEqual([
			["Bank", 0],
			["Checking", 1],
			["Savings", 0],
		])
	})

	test("gives a parent no balance and a leaf its own balance, as the CLI printed it", () => {
		const [assets] = accountGroups(accounts, rows)
		const bank = assets?.nodes.find((node) => node.name === "Bank")
		const checking = assets?.nodes.find((node) => node.name === "Checking")
		expect(bank?.leaf).toBe(false)
		expect(bank?.balances).toEqual([])
		expect(checking?.leaf).toBe(true)
		expect(checking?.balances).toEqual([{ currency: "THB", amount: "1500.00" }])
	})

	test("marks an archived account and keeps it in its place", () => {
		const [assets] = accountGroups(accounts, rows)
		const savings = assets?.nodes.find((node) => node.name === "Savings")
		expect(savings?.archived).toBe(true)
		expect(savings?.balances).toEqual([{ currency: "THB", amount: "0.00" }])
	})

	test("shows no balance for a leaf the CLI gave no row for, rather than inventing one", () => {
		const [assets] = accountGroups(
			accounts,
			rows.filter((item) => item.account.id !== "savings"),
		)
		const savings = assets?.nodes.find((node) => node.name === "Savings")
		expect(savings?.balances).toEqual([])
	})

	test("keeps a sign the CLI printed as it is", () => {
		const income = accountGroups(accounts, rows).find((group) => group.type === "income")
		expect(income?.nodes[0]?.balances).toEqual([{ currency: "THB", amount: "-2000.00" }])
	})

	test("lists an account whose parent is of another type as a root of its own type", () => {
		const mixed = [
			account({ id: "bank", name: "Bank" }),
			account({ id: "fee", name: "Fee", type: "expense", parentId: "bank" }),
		]
		const groups = accountGroups(mixed, [])
		expect(groups.map((group) => [group.type, group.nodes[0]?.depth])).toEqual([
			["asset", 0],
			["expense", 0],
		])
	})

	test("lists every account of a parent cycle, which the CLI never writes", () => {
		const cycle = [
			account({ id: "a", name: "A", parentId: "b" }),
			account({ id: "b", name: "B", parentId: "a" }),
		]
		const [assets] = accountGroups(cycle, [])
		expect(assets?.nodes.map((node) => node.name).sort()).toEqual(["A", "B"])
	})

	test("returns no group when there are no accounts", () => {
		expect(accountGroups([], [])).toEqual([])
	})
})
