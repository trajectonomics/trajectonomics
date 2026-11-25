import { describe, expect, test } from "bun:test"
import type { AccountList, Read } from "../../contract"
import { accountNames, isNamed, nameOf } from "./names"

type Row = AccountList["accounts"][number]

function row(id: string, name: string, parentId: string | null = null): Row {
	return {
		id,
		name,
		type: "asset",
		currency: "THB",
		parentId,
		archivedAt: null,
		version: 1,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
	}
}

function read(accounts: Row[]): Read<AccountList> {
	return { argv: ["account", "list", "--json"], ok: true, data: { accounts } }
}

describe("account names", () => {
	test("an Account is named by its ledger name, not its id", () => {
		const names = accountNames(read([row("01-aaaa", "Bank"), row("01-bbbb", "Fund")]))
		expect(nameOf(names, "01-aaaa")).toBe("Bank")
		expect(nameOf(names, "01-bbbb")).toBe("Fund")
		expect(isNamed(names, "01-aaaa")).toBe(true)
	})

	test("an id the ledger does not name falls back to the id and is not named", () => {
		const names = accountNames(read([row("01-aaaa", "Bank")]))
		expect(nameOf(names, "condo")).toBe("condo")
		expect(isNamed(names, "condo")).toBe(false)
	})

	test("without a successful accounts Read every id stays as it is", () => {
		expect(accountNames(undefined).size).toBe(0)
		const failed: Read<AccountList> = {
			argv: ["account", "list", "--json"],
			ok: false,
			error: { code: "database_busy", exitCode: 75, message: "busy" },
		}
		expect(accountNames(failed).size).toBe(0)
		expect(nameOf(accountNames(failed), "01-aaaa")).toBe("01-aaaa")
	})

	test("a plan that holds an Account by its unique name shows that name as named", () => {
		const names = accountNames(read([row("01-aaaa", "Bank")]))
		expect(isNamed(names, "Bank")).toBe(true)
		expect(nameOf(names, "Bank")).toBe("Bank")
	})

	test("a name two Accounts share is not a key, so it never picks one of them", () => {
		const names = accountNames(
			read([
				row("01-p1", "Bank A"),
				row("01-p2", "Bank B"),
				row("01-s1", "Savings", "01-p1"),
				row("01-s2", "Savings", "01-p2"),
			]),
		)
		expect(isNamed(names, "Savings")).toBe(false)
	})

	test("two Accounts of one name are told apart by the shortest parent path", () => {
		const names = accountNames(
			read([
				row("01-p1", "Bank A"),
				row("01-p2", "Bank B"),
				row("01-s1", "Savings", "01-p1"),
				row("01-s2", "Savings", "01-p2"),
			]),
		)
		expect(nameOf(names, "01-s1")).toBe("Bank A › Savings")
		expect(nameOf(names, "01-s2")).toBe("Bank B › Savings")
		expect(nameOf(names, "01-p1")).toBe("Bank A")
	})

	test("a top-level Account and a nested one of the same name need only the nested one's parent", () => {
		const names = accountNames(
			read([row("01-p1", "Bank"), row("01-s0", "Savings"), row("01-s1", "Savings", "01-p1")]),
		)
		expect(nameOf(names, "01-s0")).toBe("Savings")
		expect(nameOf(names, "01-s1")).toBe("Bank › Savings")
	})

	test("the path grows only as far as it takes: a shared parent name is left out", () => {
		const names = accountNames(
			read([
				row("01-r", "Assets"),
				row("01-a", "Bank A", "01-r"),
				row("01-b", "Bank B", "01-r"),
				row("01-s1", "Savings", "01-a"),
				row("01-s2", "Savings", "01-b"),
			]),
		)
		expect(nameOf(names, "01-s1")).toBe("Bank A › Savings")
		expect(nameOf(names, "01-s2")).toBe("Bank B › Savings")
	})

	test("a path takes a second parent when the first is the same", () => {
		const names = accountNames(
			read([
				row("01-a", "Bank A"),
				row("01-b", "Bank B"),
				row("01-ia", "ISA", "01-a"),
				row("01-ib", "ISA", "01-b"),
				row("01-xa", "Stocks", "01-ia"),
				row("01-xb", "Stocks", "01-ib"),
			]),
		)
		expect(nameOf(names, "01-xa")).toBe("Bank A › ISA › Stocks")
	})

	test("one that shares a parent and a name takes the shortest tail of its id that differs", () => {
		const names = accountNames(
			read([
				row("01-p", "Bank"),
				row("0a-1111-aaaa", "Savings", "01-p"),
				row("0a-1111-bbbb", "Savings", "01-p"),
			]),
		)
		expect(nameOf(names, "0a-1111-aaaa")).toBe("Bank › Savings (aaaa)")
		expect(nameOf(names, "0a-1111-bbbb")).toBe("Bank › Savings (bbbb)")
		const all = new Set([nameOf(names, "0a-1111-aaaa"), nameOf(names, "0a-1111-bbbb")])
		expect(all.size).toBe(2)
	})

	test("an id tail grows past four characters when the shorter tails agree", () => {
		const names = accountNames(read([row("x-1aaaa", "Cash"), row("x-2aaaa", "Cash")]))
		expect(nameOf(names, "x-1aaaa")).toBe("Cash (1aaaa)")
		expect(nameOf(names, "x-2aaaa")).toBe("Cash (2aaaa)")
	})

	test("a parent the Read does not hold, or a loop of parents, ends the path", () => {
		const names = accountNames(
			read([
				row("01-a", "Cash", "01-gone"),
				row("01-b", "Cash", "01-c"),
				row("01-c", "Loop", "01-b"),
			]),
		)
		expect(nameOf(names, "01-a")).not.toBe(nameOf(names, "01-b"))
	})

	test("the names follow the Read: a renamed Account shows its new name", () => {
		const before = accountNames(read([row("01-aaaa", "Bank")]))
		const after = accountNames(read([row("01-aaaa", "Everyday account")]))
		expect(nameOf(before, "01-aaaa")).toBe("Bank")
		expect(nameOf(after, "01-aaaa")).toBe("Everyday account")
	})
})
