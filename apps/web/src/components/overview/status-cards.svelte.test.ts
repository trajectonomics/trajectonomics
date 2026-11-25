import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"

import { preferences } from "../../client/preferences.svelte.js"
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
	test("words the total and its largest rows by direction, and keeps the ledger's figure in a title", () => {
		const data = pnl(
			[row("Salary", "income", "-900000.00"), row("Rent", "expense", "140000.00")],
			THB("760000.00"),
		)
		const { body } = render(PnlCard, {
			props: { pnl: okRead(["report", "pnl"], pnlView(data)) },
		})
		expect(body).toContain("Profit and loss, year to date")
		expect(body).toContain("Money in")
		expect(body).toContain("760,000.00")
		expect(body).toContain("Money out")
		expect(body).toContain("140,000.00")
		expect(body).toContain("Salary")
		expect(body).toContain('title="The ledger states −900,000.00 THB"')
		expect(body).not.toContain("as the ledger books them")
	})

	test("reads a negative total as money out", () => {
		const data = pnl(
			[row("Salary", "income", "-900000.00"), row("Rent", "expense", "950000.00")],
			THB("-50000.00"),
		)
		const { body } = render(PnlCard, {
			props: { pnl: okRead(["report", "pnl"], pnlView(data)) },
		})
		expect(body).toContain("Money out")
		expect(body).toContain("50,000.00")
	})

	test("reads a refunded expense as money in and a reversed income as money out, not by account type", () => {
		const refund = render(PnlCard, {
			props: {
				pnl: okRead(
					["report", "pnl"],
					pnlView(pnl([row("Refund", "expense", "-1500.00")], THB("0.00"))),
				),
			},
		}).body
		expect(refund).toContain("Money in")
		expect(refund).toContain("1,500.00")
		expect(refund).not.toContain("Money out")
		const reversal = render(PnlCard, {
			props: {
				pnl: okRead(
					["report", "pnl"],
					pnlView(pnl([row("Reversal", "income", "700.00")], THB("0.00"))),
				),
			},
		}).body
		expect(reversal).toContain("Money out")
		expect(reversal).toContain("700.00")
		expect(reversal).not.toContain("Money in")
	})

	test("gives a zero total no direction word", () => {
		const { body } = render(PnlCard, {
			props: { pnl: okRead(["report", "pnl"], pnlView(pnl([], THB("0.00")))) },
		})
		expect(body).toContain("0.00")
		expect(body).not.toContain("Money in")
		expect(body).not.toContain("Money out")
	})

	test("Hide amounts masks the digits and keeps the direction word", () => {
		const data = pnl([row("Salary", "income", "-900000.00")], THB("900000.00"))
		preferences.hidden = true
		let body = ""
		try {
			body = render(PnlCard, { props: { pnl: okRead(["report", "pnl"], pnlView(data)) } }).body
		} finally {
			preferences.hidden = false
		}
		expect(body).toContain("Money in")
		expect(body).toContain("•••••")
		expect(body).not.toContain("900,000.00")
		expect(body).not.toContain("The ledger states")
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
