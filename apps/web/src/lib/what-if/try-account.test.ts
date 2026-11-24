import { describe, expect, test } from "bun:test"
import { changesOf, startWhatIf } from "./session"
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
