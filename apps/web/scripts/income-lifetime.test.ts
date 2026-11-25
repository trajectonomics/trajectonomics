// The fees and payouts over the plan against the real traj (sim ADR 0027, 0028; cli ADR 0067; web ADR 0017): a 1% fee on the
// fund shows on its card and on Home, each the figure `projection run` states, and each equal to the years the card lists.
import { afterAll, afterEach, beforeAll, describe, expect } from "bun:test"
import { render } from "svelte/server"
import NetWorthCard from "../src/components/overview/NetWorthCard.svelte"
import AccountLifetimes from "../src/components/plan-items/AccountLifetimes.svelte"
import { overviewView } from "../src/lib/view/overview/view"
import { accountItems } from "../src/lib/view/what-if/plan-items"
import { SLOW_MS } from "./edit-fixture.test-support"
import { settle } from "./editor-running.test-support"
import { minor, runOf, savePayoutAndFee, slow, snapshotOf } from "./income.test-support"
import { disposeIncome, PLAN, setupIncome } from "./income-ledger.test-support"

let fund = ""
beforeAll(async () => {
	fund = (await setupIncome()).fund
}, SLOW_MS)
afterAll(disposeIncome)
afterEach(settle, SLOW_MS)

/** The sum of decimal money strings, in minor units: test arithmetic only, the page adds nothing. */
const sum = (amounts: readonly (string | null)[]): bigint =>
	amounts.reduce((total, amount) => total + minor(amount ?? "0.00"), 0n)

describe("a 1% fee and a quarterly payout, over the whole plan", () => {
	slow(
		"the fund's card states what it was charged and paid out in all, the sum of its years",
		async () => {
			const snapshot = snapshotOf(await savePayoutAndFee(fund))
			const read = snapshot.reads.documents[PLAN]
			if (read === undefined || !read.ok) throw new Error("no document")
			const card = accountItems(read.data.scenario.document, snapshot.reads.baseline, null, {
				run: runOf(snapshot),
			}).cards.find((one) => one.id === fund)
			expect(card?.years.length).toBeGreaterThan(1)
			expect(minor(card?.lifetimeFees ?? "")).toBe(sum((card?.years ?? []).map((year) => year.fee)))
			expect(minor(card?.lifetimePayouts ?? "")).toBe(
				sum((card?.years ?? []).map((year) => year.payout)),
			)
			// The first year is worked by hand in income.test.ts (7,316.29 and 12,732.88), so the totals are above it.
			expect(minor(card?.lifetimeFees ?? "")).toBeGreaterThan(731629n)
			const { body } = render(AccountLifetimes, {
				props: {
					fees: card?.lifetimeFees ?? null,
					payouts: card?.lifetimePayouts ?? null,
					currency: "THB",
				},
			})
			expect(body).toContain("Fees over the plan")
			expect(body).toContain("Paid out over the plan")
		},
	)

	slow("Home's Net worth card says the fees over the plan, the figure the run states", async () => {
		const snapshot = snapshotOf(await savePayoutAndFee(fund))
		const view = overviewView(snapshot)
		if (!view.netWorth.ok) throw new Error("the net worth card failed")
		expect(view.netWorth.data.fees).toEqual({
			amount: runOf(snapshot).lifetimeFees ?? "",
			currency: "THB",
		})
		const { body } = render(NetWorthCard, { props: { netWorth: view.netWorth } })
		expect(body).toContain("Fees over the plan")
	})
})
