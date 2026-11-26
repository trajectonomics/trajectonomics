// The Tax profile page after a holder swap, through the real traj (cli ADR-0075, web ADR 0016): every control that would
// send a bare flat claim waits for `--from-stored` and says why, the controls that name their person stay on, and after the
// command every control is back and a bare value writes the person the page names.
import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import TaxDrawer from "../src/components/tax-settings/TaxDrawer.svelte"
import TaxProfileCard from "../src/components/tax-settings/TaxProfileCard.svelte"
import type { ScenarioShow, Snapshot } from "../src/lib/contract"
import { type TaxFlags, taxTokens } from "../src/lib/edit/tax-flags"
import { personNames } from "../src/lib/view/item-names"
import {
	FLAT_CLAIM_KEYS,
	flatClaimant,
	flatClaimNote,
	isFlatClaim,
} from "../src/lib/view/tax-settings/claims"
import { type GroupKey, groupCards } from "../src/lib/view/tax-settings/groups"
import { notStated } from "../src/lib/view/tax-settings/not-stated"
import { claimNoteLines } from "../src/lib/view/tax-settings/notes"
import { sharedInterestClaimed } from "../src/lib/view/tax-settings/shared-plan"
import { SLOW_MS } from "./edit-fixture.test-support"
import { settle } from "./editor-running.test-support"
import { post, refresh } from "./swap-editor.test-support"
import {
	contentHash,
	disposeSwap,
	fromStored,
	PLAN,
	setupSwap,
	storedProfile,
} from "./tax-swap-ledger.test-support"

beforeAll(async () => {
	await setupSwap()
}, SLOW_MS)
afterEach(settle, SLOW_MS)
afterAll(disposeSwap)

function shown(snapshot: Snapshot): ScenarioShow["scenario"] {
	const read = snapshot.reads.documents[PLAN]
	if (read === undefined || !read.ok) throw new Error("the plan has a document")
	return read.data.scenario
}

function card(snapshot: Snapshot): string {
	const run = snapshot.reads.projections[PLAN]
	return render(TaxProfileCard, {
		props: {
			name: PLAN,
			show: shown(snapshot),
			editable: true,
			notes: claimNoteLines(snapshot.reads.taxNotes[PLAN]),
			years: run?.ok === true ? run.data.taxYears : [],
		},
	}).body
}

/** The drawer of one group, as the page renders it: its note names the recorded claimant. */
function drawer(snapshot: Snapshot, group: GroupKey): string {
	const show = shown(snapshot)
	const profile = show.tax ?? null
	const claimant =
		profile === null ? null : flatClaimant(profile, show.household, personNames(show.household))
	return render(TaxDrawer, {
		props: {
			open: true,
			name: PLAN,
			contentHash: show.contentHash,
			openedOn: show.contentHash,
			profile,
			group,
			unlabelled: [],
			flatClaimsLocked: claimant !== null,
			flatClaimNote: claimant === null ? "" : flatClaimNote(claimant, PLAN),
			onClose: () => {},
		},
	}).body
}

describe("the swapped state the real traj reports", () => {
	test("locks every flat claim, says why once with the plan's command, and keeps the safe controls on", async () => {
		const snapshot = await refresh()
		const show = shown(snapshot)
		const profile = show.tax ?? null
		if (profile === null) throw new Error("the plan stores a profile")
		const people = personNames(show.household)
		const claimant = flatClaimant(profile, show.household, people)
		expect(claimant?.subject).toBe("your partner")
		expect(profile.claimsHolder).toBe("me")

		const body = card(snapshot)
		expect(body).toContain(
			`These claims are still recorded under your partner. Run \`traj scenario tax ${PLAN} --from-stored\` to record them under each person, then edit them here.`,
		)
		for (const title of ["family", "insurance", "giving", "social security"]) {
			expect(body).toMatch(
				new RegExp(`<button[^>]*disabled=""[^>]*>\\s*Edit ${title}\\s*</button>`),
			)
		}
		for (const title of ["home", "filing status"]) {
			expect(body).not.toMatch(
				new RegExp(`<button[^>]*disabled=""[^>]*>\\s*Edit ${title}\\s*</button>`),
			)
		}
		expect(body).toMatch(
			/<button[^>]*disabled=""[^>]*>\s*Your partner(?:&#39;|')s health insurance premiums\s*<\/button>/,
		)
		expect(body).toContain('href="/optimize/allowances/"')

		// The two Edits left on open a form where only the status and the shared interest can be stated.
		const enabled = groupCards(profile, claimant, sharedInterestClaimed(profile, show.document))
			.filter((one) => !one.rows.every((row) => isFlatClaim(row.key)))
			.map((one) => one.key)
		expect(enabled).toEqual(["filing", "home"])
		const home = drawer(snapshot, "home")
		expect(home).toContain("still recorded under your partner")
		expect(home).toMatch(/<input[^>]*id="tax-mortgageInterest"[^>]*disabled/)
		expect(home).not.toMatch(/<input[^>]*id="tax-sharedMortgageInterest"[^>]*disabled/)
		expect(home).toMatch(/<button[^>]*disabled=""[^>]*>\s*State the whole profile instead/)
		expect(drawer(snapshot, "filing")).not.toMatch(
			/<select[^>]*id="tax-filing-status"[^>]*disabled/,
		)

		// No control left enabled sends a bare flat claim: its flags are the status and `shared=`.
		const writable: TaxFlags = { filingStatus: "married_separate", sharedMortgageInterest: "60000" }
		for (const key of FLAT_CLAIM_KEYS) expect(key in writable).toBe(false)
		expect(taxTokens(writable)).toEqual([
			"--filing-status",
			"married_separate",
			"--mortgage-interest",
			"shared=60000",
		])
		// Every not-stated class that is not a contribution Flow is a flat claim, so its button waits.
		const flat = notStated(show.taxAllowances, claimant).filter((one) => one.place !== "flows")
		expect(flat.map((one) => one.class)).toContain("healthInsurance")
		expect(flat.every((one) => isFlatClaim(one.class))).toBe(true)
	})

	test("after --from-stored every control is back and a bare value writes the person it names", async () => {
		fromStored()
		const snapshot = await refresh()
		const show = shown(snapshot)
		const profile = show.tax ?? null
		if (profile === null) throw new Error("the plan stores a profile")
		expect(profile.claimsHolder).toBe("partner")
		expect(flatClaimant(profile, show.household, personNames(show.household))).toBeNull()

		const body = card(snapshot)
		expect(body).not.toContain("still recorded under")
		expect(body).not.toMatch(/<button[^>]*disabled=""/)

		// The page's "You" is the holder, "partner": a bare life-insurance value names them, and leaves the old holder's.
		const answer = await post("edit", {
			kind: "merge-tax",
			name: PLAN,
			contentHash: contentHash(),
			flags: { lifeInsurance: "20000" },
		})
		if (!answer.ok) throw new Error(answer.error.message)
		const after = storedProfile()
		expect(after).toMatchObject({
			claimsHolder: "partner",
			lifeInsurance: 20000,
			returns: {
				me: { lifeInsurance: 15000 },
				partner: { lifeInsurance: 20000 },
			},
		})
	})
})
