import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { preferences } from "../../client/preferences.svelte.js"
import { NO_PEOPLE, snapshotPeople } from "../../lib/view/item-names"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import AllowancesFocus from "./AllowancesFocus.svelte"

const READ = DEMO.reads.allowances["base"]
const SEPARATE = DEMO.reads.allowances["separate"]
if (READ === undefined || SEPARATE === undefined)
	throw new Error("the Demo has both allowances reads")
const PEOPLE = snapshotPeople(DEMO, ["separate"])["separate"] ?? NO_PEOPLE

describe("AllowancesFocus", () => {
	test("labels the section with the saving and the year, and names each allowance's bar", () => {
		const { body } = render(AllowancesFocus, {
			props: { read: READ, plan: "base", people: NO_PEOPLE, claimsHolder: null },
		})
		expect(body).toContain(
			"How much tax could you still save? 91.7k THB. By taking more of your allowances in 2026.",
		)
		expect(body).toContain("data-focus-answer")
		expect(body).toContain("91.7k")
		expect(body).toContain(">RMF<")
		expect(body).toContain(">ThaiESG<")
		expect(body.match(/bg-accent/g)).toHaveLength(2)
		expect(body).not.toContain("data-primary-action")
	})

	test("masks the saving with Hide amounts on", () => {
		preferences.hidden = true
		let body = ""
		try {
			body = render(AllowancesFocus, {
				props: { read: READ, plan: "base", people: NO_PEOPLE, claimsHolder: null },
			}).body
		} finally {
			preferences.hidden = false
		}
		expect(body).toContain(
			"How much tax could you still save? The amount is hidden. By taking more of your allowances in 2026.",
		)
		expect(body).toContain("•••••")
		expect(body).not.toContain("91.7k")
	})

	test("shows a group per Return of a separate filing, each at its own saving, never their sum", () => {
		const { body } = render(AllowancesFocus, {
			props: { read: SEPARATE, plan: "separate", people: PEOPLE, claimsHolder: null },
		})
		expect(body).toContain("You: 84.9k THB.")
		expect(body).toContain("Your partner: 4.6k THB.")
		expect(body).toContain(">You<")
		expect(body).toContain(">Your partner<")
		expect(body).toContain("84.9k")
		expect(body).toContain("text-lg")
		expect(body).toContain(">2026<")
		expect(body).not.toContain("89.5k")
	})
})
