import { describe, expect, test } from "bun:test"
import type { TaxProfile } from "../../contract"
import { taxTokens } from "../../edit/tax-flags"
import { draftOf, wholeDraftOf } from "./draft"
import { mergeFlags, sharedDropWarning, wholeFlags } from "./flags"
import { taxEdit } from "./profile-edit"
import { taxFieldOfRefusal } from "./refusal"

const HASH = `jcs1:sha256:${"0123456789abcdef".repeat(4)}`
const stored: TaxProfile = {
	tax: "th-2026",
	filingStatus: "married_separate",
	children: 0,
	childrenAtHigherRate: 0,
	claimsHolder: "me",
	sharedMortgageInterest: 60000,
}

describe("the shared home-loan interest", () => {
	test("the form states it only on a separate filing, and clearing it sends a zero", () => {
		const origin = draftOf(stored)
		expect(origin.sharedMortgageInterest).toBe("60000")
		expect(mergeFlags(origin, { ...origin, sharedMortgageInterest: "80000" })).toEqual({
			ok: true,
			flags: { sharedMortgageInterest: "80000" },
		})
		expect(mergeFlags(origin, { ...origin, sharedMortgageInterest: "" })).toEqual({
			ok: true,
			flags: { sharedMortgageInterest: "0" },
		})
		// A change of status alone sends no `shared=`, which `traj` would refuse under a joint filing.
		const joint = { ...origin, filingStatus: "married_joint", sharedMortgageInterest: "80000" }
		expect(mergeFlags(origin, joint)).toEqual({
			ok: true,
			flags: { filingStatus: "married_joint" },
		})
	})

	test("the flag is --mortgage-interest shared=<amount>, so a stated zero removes the stored one", () => {
		const draft = { ...draftOf(stored), sharedMortgageInterest: "" }
		const edit = taxEdit({ name: "base", contentHash: HASH, origin: draftOf(stored) }, draft, false)
		if (!edit.ok) throw new Error("the draft makes an Edit")
		expect(edit.edit.kind).toBe("merge-tax")
		const flags = edit.edit.kind === "merge-tax" ? edit.edit.flags : {}
		expect(taxTokens(flags)).toEqual(["--mortgage-interest", "shared=0"])
	})

	test("a whole write keeps the stored shared interest by filling it in", () => {
		const draft = wholeDraftOf(stored)
		expect(draft.sharedMortgageInterest).toBe("60000")
		expect(wholeFlags({ ...draft, filingStatus: "married_separate" })).toEqual({
			ok: true,
			flags: { filingStatus: "married_separate", sharedMortgageInterest: "60000" },
		})
	})

	test("a whole write of another status states none, and the form says what it drops", () => {
		const separate = { ...wholeDraftOf(stored), filingStatus: "married_separate" }
		const cleared = { ...separate, sharedMortgageInterest: "" }
		expect(wholeFlags({ ...wholeDraftOf(stored), filingStatus: "married_joint" })).toEqual({
			ok: true,
			flags: { filingStatus: "married_joint" },
		})
		expect(sharedDropWarning(stored, true, cleared)).toBe(
			"This save drops the stored shared home-loan interest of 60,000 THB.",
		)
		expect(sharedDropWarning(stored, true, { ...cleared, filingStatus: "married_joint" })).toBe(
			"This save drops the stored shared home-loan interest of 60,000 THB.",
		)
		expect(sharedDropWarning(stored, true, separate)).toBeNull()
		// No status chosen is no save yet, so no sentence about one.
		expect(sharedDropWarning(stored, true, { ...separate, filingStatus: "" })).toBeNull()
		expect(sharedDropWarning(stored, false, cleared)).toBeNull()
		expect(sharedDropWarning(null, true, cleared)).toBeNull()
	})

	test("a refusal of `shared=` lands at the shared field, not at the person's own interest", () => {
		const error = {
			code: "invalid_input",
			exitCode: 2,
			path: "--mortgage-interest",
			message: '--mortgage-interest: "shared=" states more than 100,000 baht',
		}
		expect(taxFieldOfRefusal(error)).toBe("sharedMortgageInterest")
		expect(taxFieldOfRefusal({ ...error, message: "--mortgage-interest is not an amount" })).toBe(
			"mortgageInterest",
		)
	})
})
