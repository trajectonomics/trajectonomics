import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"

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
import { HealthCard } from "./HealthCard"
import { PnlCard } from "./PnlCard"

const THB = (amount: string) => [{ currency: "THB", amount }]

describe("PnlCard", () => {
	test("shows the CLI's total, its largest rows and the sign convention", () => {
		const data = pnl(
			[row("Salary", "income", "-900000.00"), row("Rent", "expense", "140000.00")],
			THB("760000.00"),
		)
		const html = renderToStaticMarkup(<PnlCard pnl={okRead(["report", "pnl"], pnlView(data))} />)
		expect(html).toContain("Profit and loss, year to date")
		expect(html).toContain("760,000.00")
		expect(html).toContain("Salary")
		expect(html).toContain("Income is shown negative and expenses positive")
	})

	test("says so when the period has no income or expense", () => {
		const data = pnl([], [])
		const html = renderToStaticMarkup(<PnlCard pnl={okRead(["report", "pnl"], pnlView(data))} />)
		expect(html).toContain("No income or expense in this period.")
	})

	test("is its own error when its Read failed", () => {
		const read: Read<ReturnType<typeof pnlView>> = failedRead(["report", "pnl"])
		expect(renderToStaticMarkup(<PnlCard pnl={read} />)).toContain(
			"Profit and loss could not be read",
		)
	})
})

describe("HealthCard", () => {
	test("shows Needs attention and the number of failed checks", () => {
		const data = doctor([passed("directory"), failed("integrity")], false)
		const html = renderToStaticMarkup(<HealthCard health={okRead(["doctor"], healthView(data))} />)
		expect(html).toContain("Needs attention")
		expect(html).toContain("1 of 2 checks failed.")
		expect(html).toContain('href="/health/"')
	})

	test("shows OK when the ledger passes", () => {
		const data = doctor([passed("directory")])
		const html = renderToStaticMarkup(<HealthCard health={okRead(["doctor"], healthView(data))} />)
		expect(html).toContain("OK")
		expect(html).toContain("All 1 checks pass.")
	})

	test("is its own error when its Read failed", () => {
		const read: Read<HealthView> = failedRead(["doctor"])
		expect(renderToStaticMarkup(<HealthCard health={read} />)).toContain(
			"Ledger health could not be read",
		)
	})
})
