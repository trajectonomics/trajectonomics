import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { preferences } from "../../client/preferences.svelte.js"
import { netWorthPageView } from "../../lib/view/net-worth/page"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import NetWorthFocus from "./NetWorthFocus.svelte"

/** The Demo's own net worth read and history, as the page passes them. */
function props() {
	const view = netWorthPageView(DEMO)
	return { read: view.netWorth, history: view.history }
}

describe("NetWorthFocus", () => {
	test("labels the section with the whole answer, and writes only the total on the chart", () => {
		const { body } = render(NetWorthFocus, { props: props() })
		expect(body).toContain("What are you worth today? 1.21M THB as of 31 Oct 2026.")
		expect(body).toContain("data-focus-answer")
		expect(body).toContain("1.21M")
		expect(body).toContain("<svg")
		expect(body).toContain('aria-hidden="true"')
		expect(body).toContain("data-focus-visual")
		expect(body).not.toContain("data-primary-action")
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

	test("shows the chart's empty state in place of the picture when no month-end was read", () => {
		const view = netWorthPageView(DEMO)
		const { body } = render(NetWorthFocus, {
			props: {
				read: view.netWorth,
				history: { ...view.history, series: { name: "Net worth", points: [] } },
			},
		})
		expect(body).toContain("Nothing to chart yet")
		expect(body).not.toContain("data-focus-section")
	})
})
