import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"

import type { Read } from "../../lib/contract"
import {
	doctor,
	failed,
	failedRead,
	okRead,
	passed,
	pnl,
	row,
} from "../../lib/view/overview/fixtures.test-support"
import { type HealthView, healthView } from "../../lib/view/overview/health"
import { pnlView } from "../../lib/view/overview/pnl"
import HealthCard from "./HealthCard.svelte"
import PnlCard from "./PnlCard.svelte"

const THB = (amount: string) => [{ currency: "THB", amount }]

describe("PnlCard", () => {
	test("shows the CLI's total, its largest rows and the sign convention", () => {
		const data = pnl(
			[row("Salary", "income", "-900000.00"), row("Rent", "expense", "140000.00")],
			THB("760000.00"),
		)
		const { body } = render(PnlCard, {
			props: { pnl: okRead(["report", "pnl"], pnlView(data)) },
		})
		expect(body).toContain("Profit and loss, year to date")
		expect(body).toContain("760,000.00")
		expect(body).toContain("Salary")
		expect(body).toContain("Income is shown negative and expenses positive")
	})

	test("says so when the period has no income or expense", () => {
		const data = pnl([], [])
		const { body } = render(PnlCard, {
			props: { pnl: okRead(["report", "pnl"], pnlView(data)) },
		})
		expect(body).toContain("No income or expense in this period.")
	})

	test("is its own error when its Read failed", () => {
		const read: Read<ReturnType<typeof pnlView>> = failedRead(["report", "pnl"])
		expect(render(PnlCard, { props: { pnl: read } }).body).toContain(
			"Profit and loss could not be read",
		)
	})
})

describe("HealthCard", () => {
	test("shows Needs attention and the number of failed checks", () => {
		const data = doctor([passed("directory"), failed("integrity")], false)
		const { body } = render(HealthCard, {
			props: { health: okRead(["doctor"], healthView(data)) },
		})
		expect(body).toContain("Needs attention")
		expect(body).toContain("1 of 2 checks failed.")
		expect(body).toContain('href="/health/"')
	})

	test("shows OK when the ledger passes", () => {
		const data = doctor([passed("directory")])
		const { body } = render(HealthCard, {
			props: { health: okRead(["doctor"], healthView(data)) },
		})
		expect(body).toContain("OK")
		expect(body).toContain("All 1 checks pass.")
	})

	test("is its own error when its Read failed", () => {
		const read: Read<HealthView> = failedRead(["doctor"])
		expect(render(HealthCard, { props: { health: read } }).body).toContain(
			"Ledger health could not be read",
		)
	})
})
