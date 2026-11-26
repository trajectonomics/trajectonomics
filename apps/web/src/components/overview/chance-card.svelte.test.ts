import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { chanceFixture } from "../../lib/view/chance/fixtures.test-support"
import { chanceSummaryOf } from "../../lib/view/chance/page"
import { okRead } from "../../lib/view/overview/fixtures.test-support"
import ChanceCard from "./ChanceCard.svelte"

describe("ChanceCard", () => {
	test("shows the success share and the paths it holds on, and links to the Chance of success page", () => {
		const read = okRead(["projection", "chance"], chanceSummaryOf(chanceFixture()))
		const { body } = render(ChanceCard, {
			props: { scenario: { status: "ready", name: "base", read } },
		})
		expect(body).toContain("87.00%")
		expect(body).toContain("174 of 200 seeded Market paths hold to 31 Dec 2028.")
		expect(body).toContain('href="/chance/"')
	})

	test("says the Snapshot holds no chance read when it has none for the plan", () => {
		const { body } = render(ChanceCard, {
			props: { scenario: { status: "unread", name: "base" } },
		})
		expect(body).toContain("The Snapshot holds no chance read for plan base.")
	})
})
