// The Tax profile page after a holder swap, through the real traj (cli ADR-0075, web ADR 0016).
import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test"
import { personNames } from "../src/lib/view/item-names"
import { isFlatClaim } from "../src/lib/view/tax-settings/claims"
import { flatClaimant } from "../src/lib/view/tax-settings/flat-claims"
import { groupCards } from "../src/lib/view/tax-settings/groups"
import { notStated } from "../src/lib/view/tax-settings/not-stated"
import { sharedInterestClaimed } from "../src/lib/view/tax-settings/shared-plan"
import { SLOW_MS } from "./edit-fixture.test-support"
import { settle } from "./editor-running.test-support"
import { post, refresh } from "./swap-editor.test-support"
import {
	contentHash,
	disposeSwap,
	fromStored,
	PLAN,
	planVersion,
	setupSwap,
	storedProfile,
	swapHousehold,
} from "./tax-swap-ledger.test-support"
import { card, drawer, shown } from "./tax-swap-render.test-support"

beforeAll(async () => {
	await setupSwap()
}, SLOW_MS)
afterEach(settle, SLOW_MS)
afterAll(disposeSwap)

describe("the swapped state the real traj reports", () => {
	test(
		"locks every flat claim, says why once with the plan's command, and keeps the safe controls on",
		async () => {
			const snapshot = await refresh()
			const show = shown(snapshot)
			const profile = show.tax ?? null
			if (profile === null) throw new Error("the plan stores a profile")
			const people = personNames(show.household)
			const claimant = flatClaimant(profile, show.household, people)
			expect(claimant?.subject).toBe("your partner")
			expect(profile.claimsHolder).toBe("me")

			const body = card(snapshot)
			expect(body).toContain("These claims are still recorded under your partner.")
			expect(body).toContain(`<code>traj scenario tax ${PLAN} --from-stored</code>`)
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

			const enabled = groupCards(profile, claimant, sharedInterestClaimed(profile, show.document))
				.filter((one) => !one.rows.every((row) => isFlatClaim(row.key)))
				.map((one) => one.key)
			expect(enabled).toEqual(["filing", "home"])
			const home = drawer(snapshot, "home")
			expect(home).toContain("still recorded under your partner")
			expect(home).toContain(`<code>traj scenario tax ${PLAN} --from-stored</code>`)
			expect(home).toMatch(/<input[^>]*id="tax-mortgageInterest"[^>]*disabled/)
			expect(home).not.toMatch(/<input[^>]*id="tax-sharedMortgageInterest"[^>]*disabled/)
			expect(home).toMatch(/<button[^>]*disabled=""[^>]*>\s*State the whole profile instead/)
			expect(drawer(snapshot, "filing")).not.toMatch(
				/<select[^>]*id="tax-filing-status"[^>]*disabled/,
			)

			const flat = notStated(show.taxAllowances, claimant).filter((one) => one.place !== "flows")
			expect(flat.map((one) => one.class)).toContain("healthInsurance")
			expect(flat.every((one) => isFlatClaim(one.class))).toBe(true)
		},
		SLOW_MS,
	)

	test(
		"refuses a flat merge from a tab that read before the swap, and writes nothing",
		async () => {
			const before = storedProfile()
			const version = planVersion()
			const answer = await post("edit", {
				kind: "merge-tax",
				name: PLAN,
				contentHash: contentHash(),
				flags: { lifeInsurance: "16000" },
			})
			if (answer.ok) throw new Error("the swapped plan refuses a flat merge")
			expect(answer.error.code).toBe("tax_claims_recorded_elsewhere")
			expect(answer.error.message).toContain(`traj scenario tax ${PLAN} --from-stored`)
			expect(answer.error.message).toContain("your partner")
			expect(storedProfile()).toEqual(before)
			expect(planVersion()).toBe(version)
		},
		SLOW_MS,
	)

	test(
		"after --from-stored every control is back and a bare value writes the person it names",
		async () => {
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
		},
		SLOW_MS,
	)

	test(
		"sends the shared interest and a filing status through the real edit path, and states the holder and Returns",
		async () => {
			swapHousehold()
			const snapshot = await refresh()
			const before = storedProfile()
			const show = shown(snapshot)
			if (before === null) throw new Error("the plan stores a profile")
			expect(flatClaimant(before, show.household, personNames(show.household))?.subject).toBe(
				"your partner",
			)

			const shared = await post("edit", {
				kind: "merge-tax",
				name: PLAN,
				contentHash: contentHash(),
				flags: { sharedMortgageInterest: "60000" },
			})
			if (!shared.ok) throw new Error(shared.error.message)
			const afterShared = storedProfile()
			expect(afterShared?.sharedMortgageInterest).toBe(60000)
			expect(afterShared?.returns).toEqual(before.returns)
			expect(afterShared?.claimsHolder).toBe("me")

			const status = await post("edit", {
				kind: "merge-tax",
				name: PLAN,
				contentHash: contentHash(),
				flags: { filingStatus: "married_joint" },
			})
			if (!status.ok) throw new Error(status.error.message)
			const afterStatus = storedProfile()
			expect(afterStatus?.filingStatus).toBe("married_joint")
			// A joint Return's claims are its flat keys, so the recorded holder's own entry is no longer kept.
			expect(afterStatus?.returns?.["partner"]).toEqual(before.returns?.["partner"])
			expect(afterStatus?.returns).not.toHaveProperty("me")
			expect(afterStatus?.claimsHolder).toBe("me")
		},
		SLOW_MS,
	)
})
