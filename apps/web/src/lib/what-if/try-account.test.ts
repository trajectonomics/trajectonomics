import { describe, expect, test } from "bun:test"
import type { ScenarioDocument } from "../contract"
import type { Json } from "./json"
import { lensDocument } from "./lens-document"
import { changesOf, overridesOf, startWhatIf } from "./session"
import { withTriedItem } from "./try-flow"

const STORED = { id: "fund", kind: "asset", rate: 600 }
const FEE = { bps: "1.50", rounding: "floor" }
const HASH = "jcs1:sha256:abc"

describe("an Account tried in a What-if session", () => {
	test("a first fee is one Set of the whole Account, because a Set cannot add a path", () => {
		const session = withTriedItem(startWhatIf("base", HASH), "accounts", {
			stored: STORED,
			edited: { ...STORED, fee: FEE },
		})
		expect(session.sets).toEqual([{ path: "accounts.fund", value: { ...STORED, fee: FEE } }])
		expect(changesOf(session).map((change) => [change.kind, change.label])).toEqual([
			["flow", "Fund tried as edited"],
		])
	})

	test("a changed fee that exists is a Set of the field, and a later try replaces the earlier one", () => {
		const stored = { ...STORED, fee: FEE }
		const once = withTriedItem(startWhatIf("base", HASH), "accounts", {
			stored,
			edited: { ...stored, fee: { ...FEE, bps: "0.50" } },
		})
		expect(once.sets).toEqual([{ path: "accounts.fund.fee", value: { ...FEE, bps: "0.50" } }])
		const twice = withTriedItem(once, "accounts", {
			stored,
			edited: { ...stored, fee: { ...FEE, bps: "0.25" } },
		})
		expect(twice.sets).toEqual([{ path: "accounts.fund.fee", value: { ...FEE, bps: "0.25" } }])
		expect(changesOf(twice)[0]?.label).toBe("Fund fee changed")
	})

	test("taking the fee away is one Set of the whole Account without it", () => {
		const stored = { ...STORED, fee: FEE }
		const session = withTriedItem(startWhatIf("base", HASH), "accounts", { stored, edited: STORED })
		expect(session.sets).toEqual([{ path: "accounts.fund", value: STORED }])
	})
})

describe("a second try of the same Account carries the first", () => {
	const doc = (accounts: unknown[]) => ({ accounts, flows: [] }) as unknown as ScenarioDocument
	/** The Account as the session shows it, which a drawer that tries a value starts its form from. */
	const shown = (session: ReturnType<typeof startWhatIf>, accounts: Record<string, Json>[]) =>
		lensDocument(doc(accounts), overridesOf(session)).accounts[0]

	test("a rate and then a fee, with the fee the Account already has, are two Sets that both stay", () => {
		const stored = { ...STORED, fee: FEE }
		const rate = withTriedItem(startWhatIf("base", HASH), "accounts", {
			stored,
			edited: { ...stored, rate: 700 },
		})
		const start = shown(rate, [stored]) as unknown as Record<string, Json>
		expect(start["rate"]).toBe(700)
		const both = withTriedItem(rate, "accounts", {
			stored,
			edited: { ...start, id: "fund", fee: { ...FEE, bps: "0.50" } },
		})
		expect(both.sets).toEqual([
			{ path: "accounts.fund.rate", value: 700 },
			{ path: "accounts.fund.fee", value: { ...FEE, bps: "0.50" } },
		])
		expect(shown(both, [stored])).toMatchObject({ rate: 700, fee: { bps: "0.50" } })
	})

	test("a rate and then a first fee are one Set of the whole Account, which holds both", () => {
		const rate = withTriedItem(startWhatIf("base", HASH), "accounts", {
			stored: STORED,
			edited: { ...STORED, rate: 700 },
		})
		const start = shown(rate, [STORED]) as unknown as Record<string, Json>
		const both = withTriedItem(rate, "accounts", {
			stored: STORED,
			edited: { ...start, id: "fund", fee: FEE },
		})
		expect(both.sets).toEqual([
			{ path: "accounts.fund", value: { ...STORED, rate: 700, fee: FEE } },
		])
		expect(shown(both, [STORED])).toMatchObject({ rate: 700, fee: FEE })
	})
})
