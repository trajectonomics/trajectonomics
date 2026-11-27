import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { preferences } from "../../client/preferences.svelte.js"
import type { Read } from "../../lib/contract"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import TaxFocus from "./TaxFocus.svelte"

const READ = DEMO.reads.projections["base"]
const ALLOWANCES = DEMO.reads.allowances["base"]
if (READ === undefined) throw new Error("the Demo has a projection for base")

describe("TaxFocus", () => {
	test("labels the section with the tax, its due date and the saving, and offers Save tax", () => {
		const { body } = render(TaxFocus, {
			props: { read: READ, allowances: ALLOWANCES, plan: "base" },
		})
		expect(body).toContain(
			"How much tax for 2026? 99k THB due 31 Mar 2027. You could still save 91.7k THB.",
		)
		expect(body).toContain("data-focus-answer")
		expect(body).toContain("99k")
		expect(body).toContain("Due 31 Mar 2027")
		expect(body.match(/data-primary-action/g)).toHaveLength(1)
		expect(body).toContain('href="/optimize/allowances/"')
		expect(body).toContain(">Save tax<")
	})

	test("offers no action when the read states no saving above zero", () => {
		const { body } = render(TaxFocus, { props: { read: READ, plan: "base" } })
		expect(body).toContain("How much tax for 2026? 99k THB due 31 Mar 2027.")
		expect(body).not.toContain("You could still save")
		expect(body).not.toContain("data-primary-action")
	})

	test("masks the tax and the saving with Hide amounts on", () => {
		preferences.hidden = true
		let body = ""
		try {
			body = render(TaxFocus, {
				props: { read: READ, allowances: ALLOWANCES, plan: "base" },
			}).body
		} finally {
			preferences.hidden = false
		}
		expect(body).toContain(
			"How much tax for 2026? The amount is hidden. Due 31 Mar 2027. You could still save an amount that is hidden.",
		)
		expect(body).toContain("•••••")
		expect(body).not.toContain("99k")
		expect(body).not.toContain("91.7k")
	})

	test("has no focus point for a plan with no tax rules", () => {
		const read: Read<never> = {
			argv: ["projection", "run", "--json"],
			ok: false,
			error: { code: "LEDGER_EMPTY", exitCode: 2, message: "The ledger is empty." },
		}
		const { body } = render(TaxFocus, { props: { read, plan: "base" } })
		expect(body).toContain("The tax of base could not be read")
		expect(body).not.toContain("data-focus-section")
	})
})
