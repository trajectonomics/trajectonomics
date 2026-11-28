import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { assumedCard } from "../../lib/view/assumed/card"
import { DOCUMENT, ONE_OF_EACH } from "../../lib/view/assumed/fixtures.test-support"
import { assumedGroups } from "../../lib/view/assumed/groups"
import AssumedCard from "./AssumedCard.svelte"

const view = assumedCard(ONE_OF_EACH, assumedGroups(ONE_OF_EACH, DOCUMENT, ""), "?scenario=base")

describe("Home's card of what a plan assumes", () => {
	test("draws nothing when the plan assumes nothing", () => {
		const { body } = render(AssumedCard, { props: { view: null } })
		expect(body).not.toContain("This plan assumes")
		expect(body).not.toContain("<section")
	})

	test("states the count and three sentences, as one link to the list on the Plan page", () => {
		const { body } = render(AssumedCard, { props: { view } })
		expect(body).toContain("This plan assumes")
		expect(body).toMatch(/text-lg[^>]*>7</)
		expect(body.match(/<li/g)).toHaveLength(3)
		expect(body).toContain("Inflation is 0% a year")
		expect(body).toContain("grows at 1.5% a year")
		expect(body).toContain("charges 7% interest")
		expect(body.match(/<a /g)).toHaveLength(1)
		expect(body).toContain('href="/projection/?scenario=base#assumed"')
		expect(body).toContain("focus-visible:after:outline-2")
	})

	test("stays quiet: no fill and no button", () => {
		const { body } = render(AssumedCard, { props: { view } })
		expect(body).not.toContain("bg-card")
		expect(body).not.toContain("<button")
		expect(body).toMatch(/<span aria-hidden="true"[^>]*>→</)
	})
})
