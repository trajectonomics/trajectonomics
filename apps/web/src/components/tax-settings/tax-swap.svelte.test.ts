import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import type {
	HouseholdDocument,
	ScenarioDocument,
	ScenarioShow,
	TaxProfile,
	TaxYear,
} from "../../lib/contract"
import { personNames } from "../../lib/view/item-names"
import { planDocument } from "../../lib/view/plan-items/fixtures.test-support"
import { plainYear } from "../../lib/view/tax/brackets.test-support"
import { flatClaimant, flatClaimParts } from "../../lib/view/tax-settings/flat-claims"
import TaxDrawer from "./TaxDrawer.svelte"
import TaxProfileCard from "./TaxProfileCard.svelte"

const HASH = `jcs1:sha256:${"0123456789abcdef".repeat(4)}`

/** The stored profile before `--from-stored`: its flat keys are the earlier holder's, and each Return keeps its own. */
const PROFILE: TaxProfile = {
	tax: "th-2026",
	filingStatus: "married_separate",
	children: 0,
	childrenAtHigherRate: 0,
	claimsHolder: "me",
	parents: 2,
	lifeInsurance: 15000,
	returns: {
		me: { children: 0, childrenAtHigherRate: 0, parents: 2, lifeInsurance: 15000 },
		partner: { children: 0, childrenAtHigherRate: 0, lifeInsurance: 12000 },
	},
}

const HOUSEHOLD: HouseholdDocument = {
	schemaVersion: 2,
	people: [
		{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 },
		{ id: "partner", role: "partner", born: "1992-02", lifeExpectancy: 88 },
	],
	anchors: [],
	owners: [],
}

/** The same two people after the household swapped holder and partner, before `--from-stored` ran. */
const SWAPPED: HouseholdDocument = {
	...HOUSEHOLD,
	people: [
		{ id: "partner", role: "holder", born: "1992-02", lifeExpectancy: 88 },
		{ id: "me", role: "partner", born: "1990-06", lifeExpectancy: 90 },
	],
	// Owners make `shared=` claimable, which is what keeps the Home Edit on after the swap.
	owners: [{ path: "flows.salary", person: "partner" }],
}

/** The same swap in a household that names no Owners, so the shared interest's field is not offered. */
const SWAPPED_NO_OWNERS: HouseholdDocument = { ...SWAPPED, owners: [] }

/** A household that no longer names the recorded holder: "me" has gone, and "bob" is the partner. */
const GONE: HouseholdDocument = {
	...HOUSEHOLD,
	people: [
		{ id: "partner", role: "holder", born: "1992-02", lifeExpectancy: 88 },
		{ id: "bob", role: "partner", born: "1990-06", lifeExpectancy: 90 },
	],
}

const FILERS: readonly TaxYear[] = [
	plainYear({ filer: "me", levy: "th-2026-pit@me" }),
	plainYear({ filer: "partner", levy: "th-2026-pit@partner" }),
]

/** The fixture plan with every income Flow labelled, so the page offers its controls. */
function labelled(): ScenarioDocument {
	const plan = planDocument()
	return {
		...plan,
		flows: plan.flows.map((flow) =>
			flow.kind === "income" ? { ...flow, label: "income.section40_1" } : flow,
		),
	}
}

function show(
	household: HouseholdDocument | null,
	profile: TaxProfile = PROFILE,
): ScenarioShow["scenario"] {
	return {
		id: "id",
		name: "base",
		contentHash: HASH,
		householdHash: HASH,
		forkedFrom: null,
		version: 1,
		createdAt: "2026-11-01T00:00:00Z",
		updatedAt: "2026-11-01T00:00:00Z",
		document: {
			...labelled(),
			levies: [{ id: "th-2026-pit@me" }, { id: "th-2026-pit@partner" }],
		},
		household,
		tax: profile,
		taxed: true,
		taxAllowances: {
			stated: ["parents", "lifeInsurance"],
			notStated: [
				"children",
				"healthInsurance",
				"mortgageInterest",
				"retirementContributions",
				"thaiEsg",
			],
		},
	}
}

function card(
	household: HouseholdDocument | null,
	profile: TaxProfile = PROFILE,
	pages: readonly TaxYear[] = FILERS,
): string {
	return render(TaxProfileCard, {
		props: { name: "base", show: show(household, profile), editable: true, years: pages },
	}).body
}

const drawer = (locked: boolean): string => {
	const claimant = flatClaimant(PROFILE, SWAPPED, personNames(SWAPPED))
	return render(TaxDrawer, {
		props: {
			open: true,
			name: "base",
			contentHash: HASH,
			openedOn: HASH,
			profile: PROFILE,
			group: "home",
			unlabelled: [],
			flatClaimsLocked: locked,
			flatClaimNote: locked && claimant !== null ? flatClaimParts(claimant, "base") : null,
			onClose: () => {},
		},
	}).body
}

describe("the controls after a holder swap", () => {
	test("disable every flat claim's Edit, say why once with the command in code, and keep the shared interest's Edit on", () => {
		const body = card(SWAPPED)
		expect(body).toContain("These claims are still recorded under your partner.")
		expect(body).toContain("<code>traj scenario tax base --from-stored</code>")
		expect(body).not.toContain("`traj")
		for (const title of ["family", "insurance", "giving", "social security"]) {
			expect(body).toMatch(
				new RegExp(`<button[^>]*disabled=""[^>]*>\\s*Edit ${title}\\s*</button>`),
			)
		}
		for (const title of ["home", "filing status"]) {
			expect(body).toMatch(new RegExp(`<button[^>]*>\\s*Edit ${title}\\s*</button>`))
			expect(body).not.toMatch(
				new RegExp(`<button[^>]*disabled=""[^>]*>\\s*Edit ${title}\\s*</button>`),
			)
		}
	})

	test("disable the not-stated buttons of flat claims, and name the earlier holder on them", () => {
		const body = card(SWAPPED)
		expect(body).toMatch(
			/<button[^>]*disabled=""[^>]*>\s*Your partner(?:&#39;|')s health insurance premiums\s*<\/button>/,
		)
		expect(body).toMatch(/<button[^>]*disabled=""[^>]*>\s*Children\s*<\/button>/)
		expect(body).toContain('href="/optimize/allowances/"')
		expect(body).toContain("ThaiESG contributions")
	})

	test("disable the drawer's flat fields, keep the shared interest, and offer no whole save", () => {
		const body = drawer(true)
		expect(body).toContain("These claims are still recorded under your partner.")
		expect(body).toContain("<code>traj scenario tax base --from-stored</code>")
		expect(body).not.toContain("`traj")
		expect(body).toMatch(/<input[^>]*id="tax-mortgageInterest"[^>]*disabled/)
		expect(body).not.toMatch(/<input[^>]*id="tax-sharedMortgageInterest"[^>]*disabled/)
		expect(body).toMatch(/<button[^>]*disabled=""[^>]*>\s*State the whole profile instead/)
	})

	test("keep every control on with a drawer form that is not locked", () => {
		const body = drawer(false)
		expect(body).not.toContain("still recorded under")
		expect(body).not.toMatch(/<input[^>]*id="tax-mortgageInterest"[^>]*disabled/)
		expect(body).not.toMatch(/<button[^>]*disabled=""[^>]*>\s*State the whole profile instead/)
	})

	test("leave every Edit on while the flat keys are the holder's own", () => {
		const body = card(HOUSEHOLD)
		expect(body).not.toContain("still recorded under")
		for (const title of ["family", "insurance", "home", "giving", "social security"]) {
			expect(body).toMatch(new RegExp(`<button[^>]*>\\s*Edit ${title}\\s*</button>`))
		}
		expect(body).not.toMatch(/<button[^>]*disabled=""[^>]*>\s*Edit /)
	})

	test("names a departed holder as the earlier holder, and says the claims stay unclaimed", () => {
		const body = card(GONE)
		expect(body).toContain(
			"These claims are still recorded under the earlier holder, who is no longer in the household.",
		)
		expect(body).toContain(
			"They stay unclaimed until they are stated for a person who has a Return.",
		)
		expect(body).toContain("<code>traj scenario tax base --from-stored</code>")
		expect(body).not.toContain("record them under each person")
	})

	test("locks the Home card when the shared interest's field is not offered", () => {
		const locked = card(SWAPPED_NO_OWNERS)
		expect(locked).toMatch(/<button[^>]*disabled=""[^>]*>\s*Edit home\s*<\/button>/)
		expect(locked).toMatch(/<button[^>]*>\s*Edit filing status\s*<\/button>/)
		const offered = card(SWAPPED)
		expect(offered).not.toMatch(/<button[^>]*disabled=""[^>]*>\s*Edit home\s*<\/button>/)
	})
})
