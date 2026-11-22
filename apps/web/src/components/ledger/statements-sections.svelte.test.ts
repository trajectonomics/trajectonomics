import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import type { Balance, Pnl, Read } from "../../lib/contract"
import { balance, failure } from "./fixtures.test-support"
import PnlSection from "./PnlSection.svelte"
import TrialBalanceSection from "./TrialBalanceSection.svelte"

describe("TrialBalanceSection", () => {
	test("shows the trial balance's lines and its totals per currency", () => {
		const { body } = render(TrialBalanceSection, { props: { balance } })
		expect(body).toContain("Trial balance at 31 Oct 2026")
		expect(body).toContain("Totals, as the CLI states them")
		expect(body).toContain("1,500.00")
	})

	test("says there is no trial balance when the Read stated none", () => {
		const without: Read<Balance> = {
			argv: balance.argv,
			ok: true,
			data: { asOf: "2026-10-31", rows: [], netWorth: [] },
		}
		const { body } = render(TrialBalanceSection, { props: { balance: without } })
		expect(body).toContain("No trial balance in this Snapshot")
	})

	test("shows the CLI's error in its section when the balance Read failed", () => {
		const { body } = render(TrialBalanceSection, {
			props: { balance: failure<Balance>(balance.argv, "Balances are unavailable.") },
		})
		expect(body).toContain("The trial balance could not be read")
	})
})

describe("PnlSection", () => {
	const report: Read<Pnl> = {
		argv: ["report", "pnl", "--since", "2026-01-01", "--until", "2026-10-31", "--json"],
		ok: true,
		data: {
			since: "2026-01-01",
			until: "2026-10-31",
			project: null,
			rows: [
				{
					account: { id: "salary", name: "Salary" },
					type: "income",
					amount: "-900.00",
					currency: "THB",
				},
			],
			totals: [{ currency: "THB", amount: "900.00" }],
		},
	}

	test("states the period, lists the income and says there are no expenses", () => {
		const { body } = render(PnlSection, { props: { pnl: report } })
		expect(body).toContain("1 Jan 2026 to 31 Oct 2026")
		expect(body).toContain("Salary")
		expect(body).toContain("−900.00")
		expect(body).toContain("No expenses in this period.")
	})

	test("shows the CLI's error in its section when the report failed", () => {
		const { body } = render(PnlSection, {
			props: { pnl: failure<Pnl>(report.argv, "No postings in the period.") },
		})
		expect(body).toContain("Profit and loss could not be read")
		expect(body).toContain("No postings in the period.")
	})
})
