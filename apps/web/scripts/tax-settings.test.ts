// The Tax profile page's Edits against the real traj (cli ADR 0066, web ADR 0016): a merge changes one item and keeps the rest,
// a whole set states the profile, a remove takes it out, a refusal names its field, and a stale save is refused. Each test
// sets up its own state, so each passes alone.
import { afterAll, afterEach, beforeAll, describe, expect } from "bun:test"
import { needsWholeProfile, taxFieldOfRefusal } from "../src/lib/view/tax-settings/refusal"
import { SLOW_MS } from "./edit-fixture.test-support"
import { settle } from "./editor-running.test-support"
import { slow } from "./estate.test-support"
import { disposeEstate, PLAN, post, setupEstate, storedPlan } from "./estate-ledger.test-support"
import { send, shownTax, withProfile } from "./tax-settings.test-support"

beforeAll(async () => {
	await setupEstate()
}, SLOW_MS)
afterEach(settle, SLOW_MS)
afterAll(disposeEstate)

describe("the tax profile through traj", () => {
	slow("a whole set states the profile, and the Snapshot reads it back", async () => {
		const { tax, taxed } = shownTax(await withProfile())
		expect(taxed).toBe(true)
		expect(tax).toEqual({
			tax: "th-2026",
			filingStatus: "married_joint",
			children: 2,
			childrenAtHigherRate: 1,
			lifeInsurance: 20000,
		})
	})

	slow("a merge changes one item and keeps every other item of the stored profile", async () => {
		await withProfile()
		const { tax } = shownTax(await send("merge-tax", { children: "3", donation1x: "5000" }))
		expect(tax).toEqual({
			tax: "th-2026",
			filingStatus: "married_joint",
			children: 3,
			childrenAtHigherRate: 1,
			lifeInsurance: 20000,
			donation1x: 5000,
		})
	})

	slow("a merge that states a deduction as zero takes it out", async () => {
		await withProfile()
		const { tax } = shownTax(await send("merge-tax", { lifeInsurance: "0" }))
		expect(tax?.lifeInsurance).toBeUndefined()
		expect(tax?.children).toBe(2)
	})

	slow(
		"a merge is checked against the merged profile, and the refusal lands at its field",
		async () => {
			await withProfile()
			const answer = await send("merge-tax", { children: "0" })
			if (answer.ok) throw new Error("the CLI took it")
			expect(answer.error.path).toBe("--children-at-higher-rate")
			expect(taxFieldOfRefusal(answer.error)).toBe("childrenAtHigherRate")
			const higher = await send("merge-tax", { childrenAtHigherRate: "5" })
			if (higher.ok) throw new Error("the CLI took it")
			expect(taxFieldOfRefusal(higher.error)).toBe("childrenAtHigherRate")
		},
	)

	slow(
		"remove takes the profile and the tax out, and a merge then asks for the whole profile",
		async () => {
			await withProfile()
			const removed = shownTax(await send("remove-tax"))
			expect(removed.tax).toBeNull()
			expect(removed.taxed).toBe(false)
			const merged = await send("merge-tax", { children: "1" })
			if (merged.ok) throw new Error("the CLI took it")
			expect(merged.error.code).toBe("invalid_input")
			expect(merged.error.message).toContain("no tax profile stored")
			expect(merged.error.hint).toContain("--tax th-2026")
			expect(needsWholeProfile(merged.error)).toBe(true)
		},
	)

	slow(
		"a shared interest too large lands at the shared field by the flags the form sent",
		async () => {
			await withProfile()
			const big = "999999999999999"
			const answer = await send("merge-tax", { sharedMortgageInterest: big })
			if (answer.ok) throw new Error("the CLI took it")
			expect(answer.error.code).toBe("invalid_input")
			expect(answer.error.path).toBe("--mortgage-interest")
			expect(answer.error.message).toBe("The value is outside its allowed range.")
			expect(taxFieldOfRefusal(answer.error, { sharedMortgageInterest: big })).toBe(
				"sharedMortgageInterest",
			)
			expect(taxFieldOfRefusal(answer.error, { mortgageInterest: big })).toBe("mortgageInterest")
		},
	)

	slow(
		"a plan with no profile is set whole, and a stale save is refused as the plan moved on",
		async () => {
			await send("remove-tax")
			const stale = storedPlan().hash
			shownTax(await send("set-tax", { filingStatus: "single" }))
			const answer = await post("edit", {
				kind: "merge-tax",
				name: PLAN,
				contentHash: stale,
				flags: { children: "1" },
			})
			if (answer.ok) throw new Error("the CLI took it")
			expect(answer.error.code).toBe("scenario_changed")
		},
	)
})
