import { describe, expect, test } from "bun:test"
import type { TaxProfile } from "../../contract"
import { taxTokens } from "../../edit/tax-flags"
import { draftOf, keepsStoredShared, type TaxDraft, wholeDraftOf } from "./draft"
import { mergeFlags, sharedDropWarning, wholeFlags } from "./flags"
import { taxEdit } from "./profile-edit"
import { taxFieldOfRefusal, taxShown } from "./refusal"

const HASH = `jcs1:sha256:${"0123456789abcdef".repeat(4)}`
const stored: TaxProfile = {
	tax: "th-2026",
	filingStatus: "married_separate",
	children: 0,
	childrenAtHigherRate: 0,
	claimsHolder: "me",
	sharedMortgageInterest: 60000,
}

/** The warning's whole sentence as the page shows it with Hide amounts off. */
function sentence(profile: TaxProfile | null, whole: boolean, draft: TaxDraft): string | null {
	const warning = sharedDropWarning(profile, whole, draft)
	return warning === null
		? null
		: `${warning.before}${warning.amount.digits}${warning.amount.after}${warning.after}`
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

	test("a whole write keeps a stored shared interest whatever its status, by filling it in", () => {
		const draft = wholeDraftOf(stored, true)
		expect(draft.sharedMortgageInterest).toBe("60000")
		expect(wholeFlags({ ...draft, filingStatus: "married_separate" })).toEqual({
			ok: true,
			flags: { filingStatus: "married_separate", sharedMortgageInterest: "60000" },
		})
		// A joint profile that keeps one is filled in too, so a save that changes it to separate keeps it.
		const joint = wholeDraftOf({ ...stored, filingStatus: "married_joint" }, true)
		expect(joint.sharedMortgageInterest).toBe("60000")
	})

	test("a whole write of another status states none, and the form says what it drops", () => {
		const separate = { ...wholeDraftOf(stored, true), filingStatus: "married_separate" }
		const cleared = { ...separate, sharedMortgageInterest: "" }
		expect(wholeFlags({ ...wholeDraftOf(stored, true), filingStatus: "married_joint" })).toEqual({
			ok: true,
			flags: { filingStatus: "married_joint" },
		})
		expect(sentence(stored, true, cleared)).toBe(
			"This save drops the stored shared home-loan interest of 60,000 THB.",
		)
		expect(sentence(stored, true, { ...cleared, filingStatus: "married_joint" })).toBe(
			"This save drops the stored shared home-loan interest of 60,000 THB.",
		)
		expect(sharedDropWarning(stored, true, separate)).toBeNull()
		// No status chosen is no save yet, so no sentence about one.
		expect(sharedDropWarning(stored, true, { ...separate, filingStatus: "" })).toBeNull()
		expect(sharedDropWarning(stored, false, cleared)).toBeNull()
		expect(sharedDropWarning(null, true, cleared)).toBeNull()
	})

	test("the sentence about the filled-in value follows the draft's status, not the stored one", () => {
		const joint = { ...wholeDraftOf({ ...stored, filingStatus: "married_joint" }, true) }
		expect(keepsStoredShared({ ...stored, filingStatus: "married_joint" }, joint, true)).toBe(false)
		const separate = { ...joint, filingStatus: "married_separate" }
		expect(keepsStoredShared({ ...stored, filingStatus: "married_joint" }, separate, true)).toBe(
			true,
		)
		expect(keepsStoredShared(stored, separate, false)).toBe(false)
		expect(keepsStoredShared(null, separate, true)).toBe(false)
	})

	test("an all-zero amount drops the stored value as an empty one does", () => {
		const separate = { ...wholeDraftOf(stored, true), filingStatus: "married_separate" }
		for (const text of ["0", "0.00", "000"]) {
			expect(sentence(stored, true, { ...separate, sharedMortgageInterest: text })).toBe(
				"This save drops the stored shared home-loan interest of 60,000 THB.",
			)
			expect(wholeFlags({ ...separate, sharedMortgageInterest: text })).toEqual({
				ok: true,
				flags: { filingStatus: "married_separate", sharedMortgageInterest: text },
			})
		}
	})

	test("a whole write with no partner or Owners fills in no shared interest and says what it drops", () => {
		const draft = wholeDraftOf(stored, false)
		expect(draft.sharedMortgageInterest).toBe("")
		const separate = { ...draft, filingStatus: "married_separate" }
		expect(wholeFlags(separate)).toEqual({ ok: true, flags: { filingStatus: "married_separate" } })
		expect(sentence(stored, true, separate)).toBe(
			"This save drops the stored shared home-loan interest of 60,000 THB.",
		)
	})

	test("keeps the words apart from the amount, so Hide amounts masks only the digits", () => {
		const separate = { ...wholeDraftOf(stored, true), filingStatus: "married_separate" }
		expect(sharedDropWarning(stored, true, { ...separate, sharedMortgageInterest: "" })).toEqual({
			before: "This save drops the stored shared home-loan interest of ",
			amount: { digits: "60,000", after: " THB" },
			after: ".",
		})
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

	test("a `shared=` refusal that names no `shared=` lands at the shared field the flags sent", () => {
		const error = {
			code: "invalid_input",
			exitCode: 2,
			path: "mortgageInterest",
			message: "The value is outside its allowed range.",
		}
		const big = "999999999999999"
		expect(taxFieldOfRefusal(error, { sharedMortgageInterest: big })).toBe("sharedMortgageInterest")
		expect(taxFieldOfRefusal(error, { mortgageInterest: big })).toBe("mortgageInterest")
		expect(
			taxShown({}, error, error.message, ["sharedMortgageInterest"], {
				sharedMortgageInterest: big,
			}).at("sharedMortgageInterest"),
		).toBe(error.message)
	})

	test("a refusal with both interests sent and no `shared=` in it is shown for the whole form", () => {
		const error = {
			code: "invalid_input",
			exitCode: 2,
			path: "--mortgage-interest",
			message: "The value is outside its allowed range.",
		}
		const flags = { mortgageInterest: "5000", sharedMortgageInterest: "999999999999999" }
		expect(taxFieldOfRefusal(error, flags)).toBeNull()
		const shown = taxShown(
			{},
			error,
			error.message,
			["mortgageInterest", "sharedMortgageInterest"],
			flags,
		)
		expect(shown.general).toBe(error.message)
		expect(shown.at("mortgageInterest")).toBeUndefined()
		expect(shown.at("sharedMortgageInterest")).toBeUndefined()
		// A message that names the shared flag still lands there.
		const named = { ...error, message: '--mortgage-interest: "shared=" states too much' }
		expect(taxFieldOfRefusal(named, flags)).toBe("sharedMortgageInterest")
	})
})
