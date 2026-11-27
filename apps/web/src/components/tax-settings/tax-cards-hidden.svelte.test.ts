import { afterEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { preferences } from "../../client/preferences.svelte.js"
import type { ScenarioShow, TaxProfile } from "../../lib/contract"
import { brandHouseholdHash } from "../../lib/contract/household-hash.test-support"
import { AMOUNT_MASK } from "../../lib/format"
import { planDocument } from "../../lib/view/plan-items/fixtures.test-support"
import TaxProfileCard from "./TaxProfileCard.svelte"

const HASH = `jcs1:sha256:${"0123456789abcdef".repeat(4)}`
const PROFILE: TaxProfile = {
	tax: "th-2026",
	filingStatus: "married_separate",
	children: 2,
	childrenAtHigherRate: 1,
	lifeInsurance: 20000,
	sharedMortgageInterest: 60000,
	claimsHolder: "me",
}

const SHOW: ScenarioShow["scenario"] = {
	id: "id",
	name: "base",
	contentHash: HASH,
	householdHash: brandHouseholdHash(HASH),
	forkedFrom: null,
	version: 1,
	createdAt: "2026-11-01T00:00:00Z",
	updatedAt: "2026-11-01T00:00:00Z",
	// A Levy that names no Filer claims no shared interest, so the card adds its "kept" words after the amount.
	document: { ...planDocument(), levies: [{ id: "th-2026-pit" }] },
	household: null,
	tax: PROFILE,
	taxed: true,
	taxAllowances: { stated: [], notStated: [] },
}

const card = (): string =>
	render(TaxProfileCard, { props: { name: "base", show: SHOW, editable: true } }).body

/** A body without Svelte's comment markers: the text and markup a browser shows. */
const shown = (body: string): string => body.replace(/<!--.*?-->/gs, "")

afterEach(() => {
	preferences.hidden = false
})

describe("the profile cards and the hide-amounts switch", () => {
	test("mask every amount, keep the words after it and the counts, and leave no amount in the accessible text", () => {
		preferences.hidden = true
		const body = card()
		expect(body).toContain(AMOUNT_MASK)
		expect(body).toContain("amount hidden")
		for (const amount of ["20,000", "60,000"]) expect(body).not.toContain(amount)
		expect(body).not.toMatch(/\d[\d,]*(?:\.\d+)? THB/)
		expect(body).not.toMatch(/aria-label="[^"]*\d[\d,]* THB/)
		expect(shown(body)).toContain("(kept, not claimed by this Return)")
		// The counts are not money: the two children and the one at the higher rate still read as digits.
		expect(shown(body)).toContain('<dd class="text-right font-medium text-foreground">2</dd>')
		expect(shown(body)).toContain('<dd class="text-right font-medium text-foreground">1</dd>')
	})

	test("shows every figure as before while the switch is off", () => {
		const body = card()
		expect(body).toContain("20,000 THB")
		expect(body).toContain("60,000 THB (kept, not claimed by this Return)")
		expect(body).not.toContain(AMOUNT_MASK)
		expect(body).not.toContain("amount hidden")
	})
})
