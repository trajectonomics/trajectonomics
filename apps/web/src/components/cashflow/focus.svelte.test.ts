import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { preferences } from "../../client/preferences.svelte.js"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import CashFlowFocus from "./CashFlowFocus.svelte"

const READ = DEMO.reads.projections["base"]
if (READ === undefined || !READ.ok) throw new Error("the Demo has a projection for base")

describe("CashFlowFocus", () => {
	test("labels the first year with what is left over and where the money came from", () => {
		const { body } = render(CashFlowFocus, { props: { run: READ.data, year: "" } })
		expect(body).toContain(
			"Where does your money go in 2026? 295k THB left over. From 2.42M THB coming in.",
		)
		expect(body).toContain("data-focus-answer")
		expect(body).toContain("295k")
		expect(body).toContain("left over")
		expect(body).toContain("2.42M")
		expect(body).toContain("h-14")
		expect(body).not.toContain("data-primary-action")
	})

	test("follows the year the address asks for", () => {
		const { body } = render(CashFlowFocus, { props: { run: READ.data, year: "1" } })
		expect(body).toContain("Where does your money go in 2027?")
	})

	test("masks the answer and the money in with Hide amounts on", () => {
		preferences.hidden = true
		let body = ""
		try {
			body = render(CashFlowFocus, { props: { run: READ.data, year: "" } }).body
		} finally {
			preferences.hidden = false
		}
		expect(body).toContain(
			"Where does your money go in 2026? The amount is hidden, and it is left over. From an amount that is hidden coming in.",
		)
		expect(body).toContain("•••••")
		expect(body).not.toContain("295k")
		expect(body).not.toContain("2.42M")
	})
})
