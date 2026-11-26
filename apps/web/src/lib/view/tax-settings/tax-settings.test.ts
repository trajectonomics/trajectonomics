import { describe, expect, test } from "bun:test"
import type { TaxProfile } from "../../contract"
import { blankDraft, draftOf } from "./draft"
import { mergeFlags, wholeFlags } from "./flags"
import { taxEdit } from "./profile-edit"
import { needsWholeProfile, taxFieldOfRefusal, taxShown } from "./refusal"
import { groupDigits, profileRows } from "./rows"

const HASH = `jcs1:sha256:${"0123456789abcdef".repeat(4)}`
const stored: TaxProfile = {
	tax: "th-2026",
	filingStatus: "married_joint",
	children: 2,
	childrenAtHigherRate: 1,
	lifeInsurance: 20000,
	mortgageInterest: 125000.5,
}

describe("the rows of a stored profile", () => {
	test("state each item as stored, and none for an item the profile leaves out", () => {
		const rows = Object.fromEntries(profileRows(stored).map((row) => [row.label, row.value]))
		expect(rows["Filing status"]).toBe("Married, filing jointly")
		expect(rows["Children"]).toBe("2")
		expect(rows["Parents you support"]).toBe("None")
		expect(
			profileRows({ ...stored, parents: 0 }).find((row) => row.label === "Parents you support")
				?.value,
		).toBe("None")
		expect(rows["Life insurance premiums"]).toBe("20,000 THB")
		expect(rows["Home-loan interest"]).toBe("125,000.5 THB")
		expect(rows["Donations counted once"]).toBe("None")
	})

	test("groups digits in threes and leaves small numbers alone", () => {
		expect(groupDigits(1234567)).toBe("1,234,567")
		expect(groupDigits(999)).toBe("999")
		expect(groupDigits(1000.25)).toBe("1,000.25")
	})
})

describe("the draft", () => {
	test("a plan with no profile starts empty, and a stored one starts as stored", () => {
		expect(Object.values(draftOf(null)).every((text) => text === "")).toBe(true)
		const draft = draftOf(stored)
		expect(draft.filingStatus).toBe("married_joint")
		expect(draft.children).toBe("2")
		expect(draft.parents).toBe("")
		expect(draft.mortgageInterest).toBe("125000.5")
	})

	test("a merge sends only the items that changed", () => {
		const draft = { ...draftOf(stored), children: "3", donation1x: "5000" }
		expect(mergeFlags(draftOf(stored), draft)).toEqual({
			ok: true,
			flags: { children: "3", donation1x: "5000" },
		})
	})

	test("a change is compared with the profile the form opened with, so an item someone else changed since is untouched", () => {
		// The form opened on `stored`; since then someone added a donation of 100 and the stored profile now carries it.
		const origin = draftOf(stored)
		const draft = { ...origin, parents: "1" }
		const target = { name: "base", contentHash: HASH, origin }
		expect(taxEdit(target, draft, false)).toEqual({
			ok: true,
			edit: { kind: "merge-tax", name: "base", contentHash: HASH, flags: { parents: "1" } },
		})
		// The draft that still holds the old blank donation is not a change to it, so no `--donation1x 0` is sent.
		expect(mergeFlags(origin, draft)).toEqual({ ok: true, flags: { parents: "1" } })
		expect(mergeFlags(origin, origin)).toEqual({
			ok: false,
			problems: { general: "Nothing is changed." },
		})
	})

	test("an amount emptied is stated as zero, so traj takes it out; a children count cannot be emptied", () => {
		expect(mergeFlags(draftOf(stored), { ...draftOf(stored), lifeInsurance: "" })).toEqual({
			ok: true,
			flags: { lifeInsurance: "0" },
		})
		const emptied = mergeFlags(draftOf(stored), { ...draftOf(stored), children: " " })
		expect(emptied).toEqual({ ok: false, problems: { children: "Enter a count, 0 for none." } })
	})

	test("nothing changed, a misshapen value and no filing status are problems at their fields", () => {
		expect(mergeFlags(draftOf(stored), draftOf(stored))).toEqual({
			ok: false,
			problems: { general: "Nothing is changed." },
		})
		const bad = mergeFlags(draftOf(stored), {
			...draftOf(stored),
			parents: "two",
			lifeInsurance: "1,000",
		})
		expect(bad.ok).toBe(false)
		if (!bad.ok) expect(Object.keys(bad.problems)).toEqual(["parents", "lifeInsurance"])
		expect(mergeFlags(draftOf(stored), { ...draftOf(stored), filingStatus: "" })).toEqual({
			ok: false,
			problems: { filingStatus: "Choose a filing status." },
		})
		expect(wholeFlags(blankDraft())).toEqual({
			ok: false,
			problems: { filingStatus: "Choose a filing status." },
		})
	})

	test("a whole profile sends the chosen status and each filled item", () => {
		const draft = {
			...blankDraft(),
			filingStatus: "single",
			children: "1",
			socialSecurity: "9000.50",
		}
		expect(wholeFlags(draft)).toEqual({
			ok: true,
			flags: { filingStatus: "single", children: "1", socialSecurity: "9000.50" },
		})
	})

	test("the Edit is a merge over a stored profile and a set without one, or by choice", () => {
		const target = { name: "base", contentHash: HASH, origin: draftOf(stored) }
		const draft = { ...draftOf(stored), children: "3" }
		expect(taxEdit(target, draft, false)).toEqual({
			ok: true,
			edit: { kind: "merge-tax", name: "base", contentHash: HASH, flags: { children: "3" } },
		})
		const whole = { ...blankDraft(), filingStatus: "single" }
		const set = {
			ok: true,
			edit: {
				kind: "set-tax",
				name: "base",
				contentHash: HASH,
				flags: { filingStatus: "single" },
				labels: [],
			},
		} as unknown as ReturnType<typeof taxEdit>
		expect(taxEdit(target, whole, true)).toEqual(set)
		expect(taxEdit({ ...target, origin: null }, whole, false)).toEqual(set)
	})

	test("a whole write labels each income Flow that has none, and asks for the ones left out", () => {
		const whole = { ...blankDraft(), filingStatus: "single" }
		const target = { name: "base", contentHash: HASH, origin: null, unlabelled: ["a", "b"] }
		const bare = taxEdit(target, whole, true, { a: "income.section40_1" })
		expect(bare).toEqual({ ok: false, problems: { "label:b": "Choose a tax label." } })
		const both = taxEdit(target, whole, true, { a: "income.section40_1", b: "income.section40_2" })
		expect(both).toMatchObject({
			ok: true,
			edit: {
				labels: [
					{ flow: "a", label: "income.section40_1" },
					{ flow: "b", label: "income.section40_2" },
				],
			},
		})
		const wrong = taxEdit(target, whole, true, { a: "allowance.thai_esg", b: "" })
		expect(wrong.ok).toBe(false)
	})
})

describe("a refusal lands at its field, in the CLI's words", () => {
	const refusal = (path: string, code = "invalid_input") => ({
		code,
		exitCode: 2,
		message: "the CLI's sentence",
		path,
	})

	test("a flag's path names the item it sets", () => {
		expect(taxFieldOfRefusal(refusal("--children-at-higher-rate"))).toBe("childrenAtHigherRate")
		expect(taxFieldOfRefusal(refusal("--spouse-life-insurance"))).toBe("spouseLifeInsurance")
		expect(taxFieldOfRefusal(refusal("--filing-status"))).toBe("filingStatus")
		expect(taxFieldOfRefusal(refusal("--tax"))).toBeNull()
		expect(taxFieldOfRefusal(null)).toBeNull()
	})

	test("the refusal is shown at its field, and any other for the whole form", () => {
		const at = taxShown({}, refusal("--children-at-higher-rate"), "the CLI's sentence")
		expect(at.at("childrenAtHigherRate")).toBe("the CLI's sentence")
		expect(at.at("children")).toBeUndefined()
		expect(at.general).toBeUndefined()
		expect(taxShown({}, refusal("--tax"), "the CLI's sentence").general).toBe("the CLI's sentence")
		expect(taxShown({ children: "own" }, null, null).at("children")).toBe("own")
	})

	test("the edit server's flat-claim refusal is shown for the whole form, with the plan's command", () => {
		const message =
			"These claims are still recorded under your partner. Run traj scenario tax base --from-stored to record them under each person, then edit them here."
		const error = { code: "tax_claims_recorded_elsewhere", exitCode: 1, message }
		const shown = taxShown({}, error, message)
		expect(shown.general).toBe(message)
		expect(shown.general).toContain("traj scenario tax base --from-stored")
		expect(shown.at("children")).toBeUndefined()
	})

	test("a refusal at an item the form does not show is shown for the whole form", () => {
		const shown = taxShown({}, refusal("--children-at-higher-rate"), "the CLI's sentence", [
			"children",
		])
		expect(shown.at("childrenAtHigherRate")).toBeUndefined()
		expect(shown.general).toBe("the CLI's sentence")
	})

	test("a merge over a plan with no stored profile asks for the profile whole", () => {
		expect(needsWholeProfile(refusal("--merge"))).toBe(true)
		expect(needsWholeProfile(refusal("--children"))).toBe(false)
		expect(needsWholeProfile(refusal("--if-hash", "scenario_changed"))).toBe(false)
	})
})
