import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { accountCards } from "../../lib/view/plan-items/accounts"
import { baselineRead, planDocument } from "../../lib/view/plan-items/fixtures.test-support"
import AccountCards from "./AccountCards.svelte"
import AccountLifetimes from "./AccountLifetimes.svelte"

describe("an Account card's totals over the plan", () => {
	test("says 'Fees over the plan' and 'Paid out over the plan' with the CLI's figures", () => {
		const { body } = render(AccountLifetimes, {
			props: { fees: "1514.01", payouts: "4051.89", currency: "THB" },
		})
		expect(body).toContain("Fees over the plan")
		expect(body).toContain("1,514.01")
		expect(body).toContain("Paid out over the plan")
		expect(body).toContain("4,051.89")
	})

	test("names only what the CLI states: a fee alone has no paid-out line, none has no block", () => {
		const fee = render(AccountLifetimes, {
			props: { fees: "9.00", payouts: null, currency: "THB" },
		})
		expect(fee.body).toContain("Fees over the plan")
		expect(fee.body).not.toContain("Paid out over the plan")
		const none = render(AccountLifetimes, { props: { fees: null, payouts: null, currency: "THB" } })
		expect(none.body).not.toContain("over the plan")
	})

	test("strikes the baseline's figure through when a what-if changes it", () => {
		const tried = render(AccountLifetimes, {
			props: { fees: "20.00", payouts: null, wasFees: "9.00", currency: "THB" },
		})
		expect(tried.body).toContain("<s class")
		expect(tried.body).toContain("9.00")
	})

	test("a fee tried on an Account that had none shows a struck 'none' beside 'Fees over the plan'", () => {
		const added = render(AccountLifetimes, {
			props: { fees: "20.00", payouts: null, wasFees: "", currency: "THB" },
		})
		expect(added.body).toContain("Fees over the plan")
		expect(added.body).toMatch(/<s class[^>]*>.*none.*<\/s>/)
	})

	test("an untouched figure shows no struck text", () => {
		const plain = render(AccountLifetimes, {
			props: { fees: "20.00", payouts: null, wasFees: undefined, currency: "THB" },
		})
		expect(plain.body).not.toContain("<s class")
	})

	test("sits on the card beside the year-by-year list, in the one column of a phone", () => {
		const run = {
			accountLifetimes: [{ account: "bank", lifetimeFees: "3.00" }],
			tables: [],
		} as never
		const [bank] = accountCards(planDocument().accounts, baselineRead(), run)
		const { body } = render(AccountCards, {
			props: {
				cards: bank === undefined ? [] : [bank],
				currency: "THB",
				editable: false,
				onEdit: () => {},
				plan: "plan",
				contentHash: "h",
				onTry: () => {},
			},
		})
		expect(body).toContain("Fees over the plan")
		expect(body).toContain("grid-cols-[auto_1fr]")
	})
})
