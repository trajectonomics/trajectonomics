import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { preferences } from "../../client/preferences.svelte.js"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import WithdrawalsFocus from "./WithdrawalsFocus.svelte"

const READ = DEMO.reads.projections["base"]
const CHANCE = DEMO.reads.chance["base"]
if (READ === undefined) throw new Error("the Demo has a projection for base")

describe("WithdrawalsFocus", () => {
	test("labels the section with the first year's amount and its share, and marks the percent", () => {
		const { body } = render(WithdrawalsFocus, {
			props: { read: READ, chance: CHANCE, terms: "both", plan: "base" },
		})
		expect(body).toContain(
			"What could you spend in retirement? 862k THB. From Jun 2050, 3.99% of your savings.",
		)
		expect(body).toContain("data-focus-answer")
		expect(body).toContain("862k")
		expect(body).toContain("Jun 2050")
		expect(body).toContain("3.99% of savings")
		expect(body).not.toContain("data-primary-action")
	})

	test("masks the amount with Hide amounts on", () => {
		preferences.hidden = true
		let body = ""
		try {
			body = render(WithdrawalsFocus, {
				props: { read: READ, chance: CHANCE, terms: "both", plan: "base" },
			}).body
		} finally {
			preferences.hidden = false
		}
		expect(body).toContain(
			"What could you spend in retirement? The amount is hidden. From Jun 2050, 3.99% of your savings.",
		)
		expect(body).toContain("•••••")
		expect(body).not.toContain("862k")
	})
})
