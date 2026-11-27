import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { HASH } from "../../client/what-if.test-support"
import type { ScenarioShow } from "../../lib/contract"
import { planDocument } from "../../lib/view/plan-items/fixtures.test-support"
import TaxProfileCard from "./TaxProfileCard.svelte"
import { NOT_STATED } from "./tax-not-stated.test-support"

const show = (
	taxAllowances: ScenarioShow["scenario"]["taxAllowances"],
): ScenarioShow["scenario"] => ({
	id: "id",
	name: "base",
	contentHash: HASH,
	householdHash: HASH,
	forkedFrom: null,
	version: 1,
	createdAt: "2026-11-01T00:00:00Z",
	updatedAt: "2026-11-01T00:00:00Z",
	document: planDocument(),
	household: null,
	tax: {
		tax: "th-2026",
		filingStatus: "single",
		children: 2,
		childrenAtHigherRate: 1,
		lifeInsurance: 20000,
	},
	taxed: true,
	taxAllowances,
})

const body = (taxAllowances: ScenarioShow["scenario"]["taxAllowances"]) =>
	render(TaxProfileCard, { props: { name: "base", show: show(taxAllowances), editable: true } })
		.body

const LABELS = ["Parents you support", "Life insurance premiums", "ThaiESG contributions"]

describe("the not-in-your-plan list is the one `traj` reports", () => {
	test("lists exactly the classes `traj` reports, and none the profile alone would suggest", () => {
		const names = (taxAllowances: ScenarioShow["scenario"]["taxAllowances"]) => {
			const text = body(taxAllowances)
			const section = text.slice(text.indexOf("Not in your plan yet"))
			return LABELS.filter((label) => section.includes(label))
		}
		// The profile states no parents, yet `traj` says only ThaiESG is left out: the page follows `traj`.
		expect(names({ stated: [], notStated: ["thaiEsg"] })).toEqual(["ThaiESG contributions"])
		expect(names({ stated: [], notStated: ["parents", "lifeInsurance"] })).toEqual([
			"Parents you support",
			"Life insurance premiums",
		])
		// No `taxAllowances` (an older Snapshot): no list, and no heading.
		expect(body(undefined)).not.toContain("Not in your plan yet")
		expect(body({ stated: [], notStated: NOT_STATED })).toContain("Not in your plan yet")
	})
})
