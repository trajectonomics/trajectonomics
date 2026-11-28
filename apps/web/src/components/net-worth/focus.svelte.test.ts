import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { preferences } from "../../client/preferences.svelte.js"
import type { Read } from "../../lib/contract"
import type { HistoryView } from "../../lib/view/net-worth/page"
import { netWorthPageView } from "../../lib/view/net-worth/page"
import type { NetWorthView } from "../../lib/view/net-worth/view"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import NetWorthFocus from "./NetWorthFocus.svelte"

/** The Demo's own net worth read and history, as the page passes them. */
function props() {
	const view = netWorthPageView(DEMO)
	return { read: view.netWorth, history: view.history }
}

const VIEW: NetWorthView = {
	asOf: "31 Oct 2026",
	totals: [{ currency: "THB", amount: "1214900.00" }],
	note: null,
	bars: [],
	liabilities: [],
	rows: [],
}

const EMPTY: HistoryView = {
	series: { name: "Net worth", points: [] },
	rows: [],
	line: "The history has no month-end read to chart.",
	cut: null,
}

const READ: Read<NetWorthView> = { argv: ["report", "networth"], ok: true, data: VIEW }

describe("NetWorthFocus", () => {
	test("labels the section with the whole answer, and writes only the total on the chart", () => {
		const { body } = render(NetWorthFocus, { props: props() })
		expect(body).toContain("What are you worth today? 1.21M THB as of 31 Oct 2026.")
		expect(body).toContain("data-focus-answer")
		expect(body).toContain("1.21M")
		expect(body).toContain("<svg")
		expect(body).toContain("As of 31 Oct 2026")
		expect(body).toContain('aria-hidden="true"')
		expect(body).toContain("data-focus-visual")
		expect(body).not.toContain("data-primary-action")
	})

	test("names the As-of the total is read at beside the last dot, not the last month-end", () => {
		const base = props()
		if (!base.read.ok) throw new Error("the Demo has a net worth read")
		const read = { ...base.read, data: { ...base.read.data, asOf: "15 Nov 2026" } }
		const { body } = render(NetWorthFocus, { props: { ...base, read } })
		expect(body).toContain("<svg")
		expect(body).toContain("As of 15 Nov 2026")
		expect(body).not.toContain("As of Oct 2026")
	})

	test("masks the total with Hide amounts on, and keeps the note that it is hidden", () => {
		preferences.hidden = true
		let body = ""
		try {
			body = render(NetWorthFocus, { props: props() }).body
		} finally {
			preferences.hidden = false
		}
		expect(body).toContain("What are you worth today? The amount is hidden. As of 31 Oct 2026.")
		expect(body).toContain("•••••")
		expect(body).toContain("amount hidden")
		expect(body).not.toContain("1.21M")
	})

	test("answers with the total and its As-of when no month-end was read, without a line", () => {
		const { body } = render(NetWorthFocus, { props: { read: READ, history: EMPTY } })
		expect(body).toContain("What are you worth today? 1.21M THB as of 31 Oct 2026.")
		expect(body).toContain("data-focus-answer")
		expect(body).toContain("As of 31 Oct 2026")
		expect(body).toContain("1,214,900.00")
		expect(body).not.toContain("<svg")
	})

	test("shows every other currency total below the answer at the large size", () => {
		const totals = [
			{ currency: "THB", amount: "1214900.00" },
			{ currency: "USD", amount: "33400.00" },
		]
		const read: Read<NetWorthView> = { ...READ, data: { ...VIEW, totals } }
		const { body } = render(NetWorthFocus, { props: { read, history: EMPTY } })
		expect(body).toContain("What are you worth today? 1.21M THB, 33.4k USD as of 31 Oct 2026.")
		expect(body).toContain("text-lg")
		expect(body).toContain("33,400.00")
		expect(body).toContain("USD")
	})
})
