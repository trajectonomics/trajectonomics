import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"

import { fiView } from "../../lib/view/overview/fi"
import { failedRead, okRead } from "../../lib/view/overview/fixtures.test-support"
import { fi, reachableFi } from "../../lib/view/overview/projection-fixtures.test-support"
import FiCard from "./FiCard.svelte"

describe("FiCard", () => {
	test("shows the month of a reachable FI date, the Scenario and a link", () => {
		const read = okRead(["fi"], fiView(reachableFi()))
		const { body } = render(FiCard, {
			props: { scenario: { status: "ready", name: "base", read } },
		})
		expect(body).toContain("Oct 2042")
		expect(body).toContain("Scenario base")
		expect(body).toContain('href="/fi/"')
	})

	test("says the horizon and what binds when FI is not reachable", () => {
		const data = fi({
			reachable: false,
			binding: "minimumBuffer",
			bestCase: {
				month: "2040-06-01",
				bufferBreach: { date: "2041-01-01", required: "1.00", accessible: "0.00" },
			},
		})
		const read = okRead(["fi"], fiView(data))
		const { body } = render(FiCard, {
			props: { scenario: { status: "ready", name: "retire-early", read } },
		})
		expect(body).toContain("Not reachable before 31 Dec 2060")
		expect(body).toContain("minimum buffer")
		expect(body).toContain("Scenario retire-early")
	})

	test("says there is no Scenario, or no FI read for it", () => {
		expect(render(FiCard, { props: { scenario: { status: "none" } } }).body).toContain(
			"names no Scenario",
		)
		const unread = { status: "unread" as const, name: "base" }
		expect(render(FiCard, { props: { scenario: unread } }).body).toContain(
			"no FI read for Scenario base",
		)
	})

	test("shows its own error when the FI Read failed", () => {
		const read = failedRead<ReturnType<typeof fiView>>(["fi"])
		const { body } = render(FiCard, {
			props: { scenario: { status: "ready", name: "base", read } },
		})
		expect(body).toContain("FI could not be read")
	})
})
