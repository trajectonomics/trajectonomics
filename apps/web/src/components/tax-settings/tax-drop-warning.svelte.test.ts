import { afterEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { preferences } from "../../client/preferences.svelte.js"
import type { TaxProfile } from "../../lib/contract"
import { AMOUNT_MASK } from "../../lib/format"
import { wholeDraftOf } from "../../lib/view/tax-settings/draft"
import { type SharedDropWarning, sharedDropWarning } from "../../lib/view/tax-settings/flags"
import TaxDropWarning from "./TaxDropWarning.svelte"

const PROFILE: TaxProfile = {
	tax: "th-2026",
	filingStatus: "married_separate",
	children: 0,
	childrenAtHigherRate: 0,
	claimsHolder: "me",
	sharedMortgageInterest: 77777,
}

/** A whole save of another status states no shared interest, so its warning names the stored one. */
const warning = (): SharedDropWarning => {
	const draft = { ...wholeDraftOf(PROFILE, true), filingStatus: "married_joint" }
	const value = sharedDropWarning(PROFILE, true, draft)
	if (value === null) throw new Error("the whole save drops the stored shared interest")
	return value
}

const body = (): string => render(TaxDropWarning, { props: { warning: warning() } }).body

/** A body without Svelte's comment markers: the text and markup a browser shows. */
const shown = (html: string): string => html.replace(/<!--.*?-->/gs, "")

afterEach(() => {
	preferences.hidden = false
})

describe("the drawer's shared-interest drop warning and the hide-amounts switch", () => {
	test("masks the stored amount's digits, keeping the words, the currency and the accessible notice", () => {
		preferences.hidden = true
		const html = body()
		expect(html).toContain(AMOUNT_MASK)
		expect(html).toContain('<span class="sr-only">amount hidden</span>')
		expect(html).not.toContain("77,777")
		expect(html).not.toMatch(/\d[\d,]*(?:\.\d+)? THB/)
		expect(shown(html)).toContain("This save drops the stored shared home-loan interest of ")
		expect(shown(html)).toContain(" THB.")
	})

	test("shows the sentence exactly as before while the switch is off", () => {
		const html = body()
		expect(shown(html)).toContain(
			"This save drops the stored shared home-loan interest of 77,777 THB.",
		)
		expect(html).not.toContain(AMOUNT_MASK)
		expect(html).not.toContain("amount hidden")
	})
})
