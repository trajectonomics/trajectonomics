import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { chanceFixture } from "../../lib/view/chance/fixtures.test-support"
import { chanceSummaryOf } from "../../lib/view/chance/page"
import { okRead } from "../../lib/view/overview/fixtures.test-support"
import ChanceCard from "./ChanceCard.svelte"

describe("ChanceCard", () => {
	test("shows the chance, its ring and the markets it holds on, and links to the Chance of success page", () => {
		const read = okRead(["projection", "chance"], chanceSummaryOf(chanceFixture()))
		const { body } = render(ChanceCard, {
			props: { scenario: { status: "ready", name: "base", read } },
		})
		expect(body).toContain("87%")
		expect(body).toContain("174 of 200 markets last")
		expect(body).toContain("<circle")
		expect(body).toContain('href="/chance/"')
	})

	test("says these figures hold no chance read when they have none for the plan", () => {
		const { body } = render(ChanceCard, {
			props: { scenario: { status: "unread", name: "base" } },
		})
		expect(body).toContain("These figures hold no chance read for plan base.")
		expect(body).not.toContain('href="/chance/"')
	})
})
