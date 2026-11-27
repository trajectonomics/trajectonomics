import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { preferences } from "../../client/preferences.svelte.js"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import AllowancesFocus from "./AllowancesFocus.svelte"

const READ = DEMO.reads.allowances["base"]
if (READ === undefined) throw new Error("the Demo has an allowances read for base")

describe("AllowancesFocus", () => {
	test("labels the section with the saving and the year, and draws one bar per allowance", () => {
		const { body } = render(AllowancesFocus, { props: { read: READ, plan: "base" } })
		expect(body).toContain(
			"How much tax could you still save? 91.7k THB by taking more of your allowances in 2026.",
		)
		expect(body).toContain("data-focus-answer")
		expect(body).toContain("91.7k")
		expect(body.match(/bg-accent/g)).toHaveLength(2)
		expect(body).not.toContain("data-primary-action")
	})

	test("masks the saving with Hide amounts on", () => {
		preferences.hidden = true
		let body = ""
		try {
			body = render(AllowancesFocus, { props: { read: READ, plan: "base" } }).body
		} finally {
			preferences.hidden = false
		}
		expect(body).toContain(
			"How much tax could you still save? The amount is hidden. By taking more of your allowances in 2026.",
		)
		expect(body).toContain("•••••")
		expect(body).not.toContain("91.7k")
	})
})
