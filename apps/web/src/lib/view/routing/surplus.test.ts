import { describe, expect, test } from "bun:test"
import { formatMoney } from "../../format"
import { documentWith } from "./change"
import { amountOf } from "./entries"
import { NAMES, planWith } from "./fixtures.test-support"
import { moved, nudged } from "./order"
import { lastStepProblem, stepDraftOf, stepFromDraft, withStep } from "./surplus"
import { plainText, stepWords } from "./words"

const text = (parts: ReturnType<typeof stepWords>) => plainText(parts, formatMoney)

describe("a surplus step in its drawer", () => {
	test("fills an account up to an amount in today's money, sent as typed", () => {
		const draft = {
			...stepDraftOf(),
			account: "emergency",
			how: "upTo" as const,
			amount: "300000",
			growth: "inflation" as const,
		}
		const made = stepFromDraft(draft)
		expect(made).toEqual({
			ok: true,
			step: { account: "emergency", upTo: { amount: "300000", growth: "inflation" } },
		})
		if (made.ok)
			expect(text(stepWords(made.step, 0, 3, NAMES))).toBe(
				"Fill Emergency fund up to 300,000 in today's money",
			)
	})

	test("puts a share of what is left, as the percent typed", () => {
		const made = stepFromDraft({ ...stepDraftOf(), account: "fund", how: "share", share: "30" })
		expect(made).toEqual({ ok: true, step: { account: "fund", share: "30" } })
		if (made.ok)
			expect(text(stepWords(made.step, 1, 3, NAMES))).toBe("Put 30% of what is left into Funds")
	})

	test("takes everything: no share and no cap, and the last one reads as everything else", () => {
		const made = stepFromDraft({ ...stepDraftOf(), account: "bank" })
		expect(made).toEqual({ ok: true, step: { account: "bank" } })
		if (made.ok)
			expect(text(stepWords(made.step, 2, 3, NAMES))).toBe("Everything else into Savings")
	})

	test("round trips: a stored step reads into a draft that writes the same step, keeping other keys", () => {
		const stored = { account: "fund", share: "30.00", upTo: "500000.00", note: "mine" }
		const draft = stepDraftOf(stored)
		expect(draft).toMatchObject({
			how: "shareUpTo",
			share: "30.00",
			amount: "500000.00",
			growth: "none",
		})
		expect(stepFromDraft(draft, stored)).toEqual({ ok: true, step: stored })
		expect(amountOf(stored.upTo)).toBe("500000.00")
	})

	test("shows a problem at each field that is not a shape traj may take, and sends nothing", () => {
		const made = stepFromDraft({
			...stepDraftOf(),
			how: "shareUpTo",
			share: "3.005",
			amount: "9000,50",
		})
		expect(made).toEqual({
			ok: false,
			problems: {
				account: "Choose an account.",
				amount: "Enter the amount as a decimal number, such as 300000.",
				share: "Enter a percent with at most two places, such as 30.",
			},
		})
	})
})

describe("a growth by a fixed rate is kept", () => {
	test("a cap that grows by 3% a year reads as a fixed growth and writes the same cap back", () => {
		const stored = { account: "fund", upTo: { amount: "500000.00", growth: { bps: 300 } } }
		const draft = stepDraftOf(stored)
		expect(draft).toMatchObject({ how: "upTo", growth: "fixed", rate: "3.00" })
		expect(stepFromDraft(draft, stored)).toEqual({ ok: true, step: stored })
		expect(stepFromDraft({ ...draft, rate: "3.005" })).toMatchObject({
			ok: false,
			problems: { rate: expect.any(String) },
		})
		if (stored.upTo) expect(text(stepWords(stored, 0, 2, NAMES))).toContain("growing 3.00% a year")
	})
})

describe("the last step takes everything", () => {
	const all = { account: "bank" }
	const share = { account: "fund", share: "30" }
	test("a list that ends in a share or a cap is refused on its last row, in words", () => {
		expect(lastStepProblem([all, share])).toMatchObject({ index: 1 })
		expect(lastStepProblem([all, { account: "fund", upTo: "1.00" }])).toMatchObject({ index: 1 })
		expect(lastStepProblem([share, all])).toBeNull()
		expect(lastStepProblem([])).toBeNull()
	})

	test("a new step that takes less goes before the last one; one that takes everything goes last", () => {
		expect(withStep([all], null, share)).toEqual([share, all])
		expect(withStep([share, all], null, { account: "emergency" })).toEqual([
			share,
			all,
			{ account: "emergency" },
		])
		expect(withStep([share, all], 0, { account: "fund", share: "40" })).toEqual([
			{ account: "fund", share: "40" },
			all,
		])
	})
})

describe("a reorder writes the new order", () => {
	test("moves and nudges one row, and the Edit's document holds the list in the new order", () => {
		const a = { account: "a", upTo: "1.00" }
		const b = { account: "b", share: "10" }
		const c = { account: "c" }
		expect(moved([a, b, c], 0, 1)).toEqual([b, a, c])
		expect(nudged([a, b, c], 2, -1)).toEqual([a, c, b])
		expect(nudged([a, b, c], 0, -1)).toEqual([a, b, c])
		const doc = planWith({ surplus: [a, b, c], contribute: ["bank"], withdraw: ["bank"] })
		const next = documentWith(doc, { kind: "list", list: "surplus", items: moved([a, b, c], 0, 1) })
		expect(next.cashflow).toEqual({ surplus: [b, a, c], contribute: ["bank"], withdraw: ["bank"] })
		expect(doc.cashflow?.surplus).toEqual([a, b, c])
	})
})
