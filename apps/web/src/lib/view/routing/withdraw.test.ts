import { describe, expect, test } from "bun:test"
import { formatMoney } from "../../format"
import { hasIlliquid, ILLIQUID_NOTE, routableAccounts } from "./accounts"
import { withdrawAccounts } from "./entries"
import { NAMES, planWith } from "./fixtures.test-support"
import { entryDraftOf, entryFromDraft, strandedFloors, withEntry } from "./withdraw"
import { entryWords, plainText } from "./words"

const words = (list: Parameters<typeof entryWords>[0], at: number) =>
	plainText(entryWords(list, at, NAMES), formatMoney)

describe("a withdraw entry in its drawer", () => {
	test("a floor is `{ account, downTo }`, sent as typed, and may keep its value in today's money", () => {
		const draft = {
			...entryDraftOf(),
			account: "bank",
			floor: true,
			amount: "300000",
			growth: "inflation" as const,
		}
		expect(entryFromDraft(draft)).toEqual({
			ok: true,
			entry: { account: "bank", downTo: { amount: "300000", growth: "inflation" } },
		})
		expect(entryFromDraft({ ...draft, growth: "none" as const })).toMatchObject({
			entry: { downTo: "300000" },
		})
	})

	test("a floor that grows by a fixed rate round trips, and an edited rate is written as basis points", () => {
		const stored = { account: "bank", downTo: { amount: "100000.00", growth: { bps: 250 } } }
		const draft = entryDraftOf(stored)
		expect(draft).toMatchObject({ floor: true, growth: "fixed", rate: "2.50" })
		expect(entryFromDraft(draft, stored)).toEqual({ ok: true, entry: stored })
		expect(entryFromDraft({ ...draft, rate: "4" }, stored)).toEqual({
			ok: true,
			entry: { account: "bank", downTo: { amount: "100000.00", growth: { bps: 400 } } },
		})
	})

	test("an entry with no floor is the Account's id; a floor with no amount is a problem at the amount", () => {
		expect(entryFromDraft({ ...entryDraftOf(), account: "fund" })).toEqual({
			ok: true,
			entry: "fund",
		})
		expect(entryFromDraft({ ...entryDraftOf(), account: "fund", floor: true })).toMatchObject({
			ok: false,
			problems: { amount: expect.any(String) },
		})
		expect(entryFromDraft(entryDraftOf())).toMatchObject({
			ok: false,
			problems: { account: expect.any(String) },
		})
	})

	test("round trips a stored floor", () => {
		const stored = { account: "bank", downTo: "100000.00" }
		expect(entryFromDraft(entryDraftOf(stored), stored)).toEqual({ ok: true, entry: stored })
	})
})

describe("a floor adds its later rest-of entry", () => {
	test("a new floor appends the Account's plain entry, and the words say so", () => {
		const floor = { account: "bank", downTo: "300000" }
		const next = withEntry(["fund"], null, floor)
		expect(next).toEqual(["fund", floor, "bank"])
		expect([0, 1, 2].map((at) => words(next, at))).toEqual([
			"Take from Funds",
			"Take from Savings, down to 300,000",
			"Then the rest of Savings",
		])
	})

	test("turning a plain entry into a floor adds the rest-of entry at the end; one already later is kept", () => {
		const floor = { account: "bank", downTo: "5.00" }
		expect(withEntry(["bank", "fund"], 0, floor)).toEqual([floor, "fund", "bank"])
		expect(withEntry([floor, "fund", "bank"], 0, { ...floor, downTo: "9.00" })).toEqual([
			{ ...floor, downTo: "9.00" },
			"fund",
			"bank",
		])
	})

	test("a plain entry adds nothing, and a floor nothing takes the rest of is stranded", () => {
		expect(withEntry(["bank"], null, "fund")).toEqual(["bank", "fund"])
		expect(strandedFloors([{ account: "bank", downTo: "1.00" }, "fund"])).toEqual([0])
		expect(strandedFloors([{ account: "bank", downTo: "1.00" }, "bank"])).toEqual([])
	})

	test("the Accounts of a list with floors are each entry's Account, once for each entry", () => {
		const doc = planWith({
			surplus: [],
			contribute: [],
			withdraw: [{ account: "bank", downTo: "1.00" }, "fund", "bank"],
		})
		expect(withdrawAccounts(doc)).toEqual(["bank", "fund", "bank"])
	})
})

describe("an illiquid asset is never offered", () => {
	test("only liquid assets are choices, and the sentence says why", () => {
		const doc = planWith(undefined)
		expect(routableAccounts(doc, NAMES)).toEqual([
			{ id: "bank", name: "Savings" },
			{ id: "emergency", name: "Emergency fund" },
			{ id: "fund", name: "Funds" },
		])
		expect(hasIlliquid(doc)).toBe(true)
		expect(ILLIQUID_NOTE).toContain("home or a car")
	})
})
