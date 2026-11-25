import { describe, expect, it } from "bun:test"
import { TaxValidationError } from "../../core/money"
import { emitThLevy } from "../levy/emit"
import { thLevyTalliesFor } from "../levy/filer-tallies"
import {
	TH_LEVY_SHARED_FILER,
	ThLevyFilerField,
	thFilerLabel,
	validateThFilers,
} from "../levy/filers"
import {
	TH_LEVY_CONTRIBUTION_LABELS,
	TH_LEVY_INCOME_LABELS,
	ThLevyContributionLabel,
	ThLevyIncomeLabel,
} from "../levy/labels"
import type { ThLevyProfile } from "../levy/profile-types"
import type { ThFilingStatus } from "../types"

function fieldOf(run: () => unknown): string | undefined {
	try {
		run()
	} catch (error) {
		return error instanceof TaxValidationError ? error.field : String(error)
	}
	return undefined
}

function refusedField(filers: readonly string[], filingStatus: ThFilingStatus): string | undefined {
	return fieldOf(() => emitThLevy({ filers, filingStatus }))
}

describe("Filer labels", () => {
	it("builds <label>@<filer>, and the shared Filer is reserved", () => {
		expect(thFilerLabel(ThLevyIncomeLabel.Section40_1, "partner-2")).toBe(
			"income.section40_1@partner-2",
		)
		expect(thFilerLabel(ThLevyIncomeLabel.Section40_4Interest, TH_LEVY_SHARED_FILER)).toBe(
			"income.section40_4.interest@shared",
		)
	})

	it("refuses an id off [a-z0-9-]{1,32}", () => {
		for (const id of ["", "Me", "a_b", "a b", "a@b", "é", "x".repeat(33)]) {
			expect(fieldOf(() => thFilerLabel("income.section40_1", id))).toBe(ThLevyFilerField.Id)
		}
		expect(thFilerLabel("l", "x".repeat(32))).toBe(`l@${"x".repeat(32)}`)
	})
})

describe("a filers list is refused, each rule with its own field", () => {
	it("refuses an empty list", () => {
		expect(refusedField([], "married_joint")).toBe(ThLevyFilerField.Empty)
	})

	it("refuses more than two Filers", () => {
		expect(refusedField(["a", "b", "c"], "married_joint")).toBe(ThLevyFilerField.Max)
	})

	it("refuses an id off the pattern, in either position", () => {
		expect(refusedField(["Me"], "single")).toBe(ThLevyFilerField.Id)
		expect(refusedField(["a", "b_"], "married_joint")).toBe(ThLevyFilerField.Id)
	})

	it("refuses the reserved shared id", () => {
		expect(refusedField([TH_LEVY_SHARED_FILER], "married_separate")).toBe(ThLevyFilerField.Shared)
		expect(refusedField(["a", TH_LEVY_SHARED_FILER], "married_joint")).toBe(ThLevyFilerField.Shared)
	})

	it("refuses a repeated id", () => {
		expect(refusedField(["a", "a"], "married_joint")).toBe(ThLevyFilerField.Duplicate)
	})

	it("refuses two Filers on every status but married_joint", () => {
		const others: ThFilingStatus[] = ["single", "married_no_income_spouse", "married_separate"]
		for (const status of others) {
			expect(refusedField(["a", "b"], status)).toBe(ThLevyFilerField.Count)
		}
		expect(fieldOf(() => emitThLevy({ filers: ["a", "b"] }))).toBe(ThLevyFilerField.Count)
	})

	it("refuses Filers on married_separate_40_1_joint_rest until a later step builds them", () => {
		expect(refusedField(["a"], "married_separate_40_1_joint_rest")).toBe(ThLevyFilerField.Status)
		expect(() => emitThLevy({ filingStatus: "married_separate_40_1_joint_rest" })).not.toThrow()
	})

	it("accepts one Filer on every other status and two on married_joint", () => {
		const statuses: ThFilingStatus[] = [
			"single",
			"married_no_income_spouse",
			"married_separate",
			"married_joint",
		]
		for (const status of statuses) expect(validateThFilers(["me"], status)).toEqual(["me"])
		expect(validateThFilers(["a", "b"], "married_joint")).toEqual(["a", "b"])
		const profile: ThLevyProfile = { filers: ["a", "b"], filingStatus: "married_joint" }
		expect(emitThLevy(profile).measures.length).toBeGreaterThan(emitThLevy().measures.length)
	})
})

describe("thLevyTalliesFor", () => {
	it("reads the bare labels with no Filer", () => {
		const read = thLevyTalliesFor([])
		expect(read.income).toEqual(TH_LEVY_INCOME_LABELS)
		expect(read.contributions).toEqual(TH_LEVY_CONTRIBUTION_LABELS)
	})

	it("reads each Filer's labels, and shared income only on a married Return", () => {
		const own = thLevyTalliesFor(["me"])
		expect(own.income).toHaveLength(TH_LEVY_INCOME_LABELS.length)
		expect(own.income).toContain("income.section40_1@me")
		expect(own.contributions).toContain(`${ThLevyContributionLabel.Rmf}@me`)
		const joint = thLevyTalliesFor(["a", "b"], "married_joint")
		expect(joint.income).toHaveLength(3 * TH_LEVY_INCOME_LABELS.length)
		expect(joint.income).toContain("income.section40_4.interest@shared")
		expect(joint.contributions).toHaveLength(2 * TH_LEVY_CONTRIBUTION_LABELS.length)
		expect(joint.contributions.some((label) => label.endsWith("@shared"))).toBe(false)
		expect(thLevyTalliesFor(["a"], "married_separate").income).toContain(
			"income.section40_1@shared",
		)
	})
})
