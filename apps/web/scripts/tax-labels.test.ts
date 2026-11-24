// The Tax profile page when the plan moves under the form, or has an income Flow with no tax label, against the real traj
// (cli ADR 0055 and 0066, web ADR 0016). Each test sets up its own state, so each passes alone.
import { afterAll, beforeAll, describe, expect } from "bun:test"
import type { TaxProfile } from "../src/lib/contract"
import { blankDraft, draftOf } from "../src/lib/view/tax-settings/draft"
import { unlabelledIncome } from "../src/lib/view/tax-settings/labels"
import { taxEdit } from "../src/lib/view/tax-settings/profile-edit"
import { flowsSentence } from "../src/lib/view/tax-settings/refusal"
import { SLOW_MS } from "./edit-fixture.test-support"
import { slow } from "./estate.test-support"
import {
	disposeEstate,
	PLAN,
	post,
	setupEstate,
	storedPlan,
	traj,
} from "./estate-ledger.test-support"
import { shownTax, withProfile } from "./tax-settings.test-support"

beforeAll(async () => {
	await setupEstate()
}, SLOW_MS)
afterAll(disposeEstate)

describe("the tax profile when the plan moves or has unlabelled income", () => {
	slow(
		"a save from a form opened before someone else's change keeps that change, after a Reload too",
		async () => {
			await withProfile()
			// The form opens on this profile and this hash.
			const opened = storedPlan().hash
			const origin = draftOf(shownTax(await post("reread", {})).tax)
			// Someone else adds a donation from a terminal.
			traj(["scenario", "tax", PLAN, "--merge", "--donation1x", "100", "--json"])
			const draft = { ...origin, parents: "1" }
			const stale = taxEdit({ name: PLAN, contentHash: opened, origin }, draft, false)
			if (!stale.ok) throw new Error("the draft makes an Edit")
			const refused = await post("edit", stale.edit)
			if (refused.ok) throw new Error("the CLI took a stale save")
			expect(refused.error.code).toBe("scenario_changed")
			// Reload names the new hash; the form's origin is still the old one, so only the parents are sent.
			await post("reread", {})
			const retry = taxEdit({ name: PLAN, contentHash: storedPlan().hash, origin }, draft, false)
			if (!retry.ok) throw new Error("the draft makes an Edit")
			expect(retry.edit).toMatchObject({ flags: { parents: "1" } })
			const { tax } = shownTax(await post("edit", retry.edit))
			expect(tax?.parents).toBe(1)
			expect(tax?.donation1x).toBe(100)
		},
	)

	slow(
		"a plan with an income Flow that has no tax label names it, and the CLI's refusal names it too",
		async () => {
			const { document } = storedPlan()
			const side = {
				id: "side-gig",
				kind: "income",
				frequency: "monthly",
				start: "2026-01-01",
				amount: "1000.00",
				growth: { bps: 0 },
				earned: true,
			}
			const plan = { ...document, flows: [...document.flows, side] }
			traj(["scenario", "apply", "salaried", "--file", "-", "--decimal", "--json"], plan)
			const unlabelled = unlabelledIncome(storedPlan("salaried").document)
			expect(unlabelled).toEqual(["side-gig"])
			const whole = taxEdit(
				{ name: "salaried", contentHash: storedPlan("salaried").hash, origin: null },
				{ ...blankDraft(), filingStatus: "single" },
				true,
			)
			if (!whole.ok) throw new Error("the draft makes an Edit")
			const answer = await post("edit", whole.edit)
			if (answer.ok) throw new Error("the CLI took an unlabelled income Flow")
			expect(answer.error.path).toBe("document")
			const sentence = flowsSentence(answer.error)
			expect(sentence).toContain("side-gig")
			expect(sentence).toContain("Tax labels")
			expect(sentence).not.toContain("@trajectonomics")
		},
	)

	slow(
		"the command the page names sets the label, and a merge then keeps the stored profile; Remove clears the labels",
		async () => {
			const name = "labelled"
			const { document } = storedPlan()
			const side = {
				id: "side-gig",
				kind: "income",
				frequency: "monthly",
				start: "2026-01-01",
				amount: "1000.00",
				growth: { bps: 0 },
				earned: true,
			}
			const plan = { ...document, flows: [...document.flows, side] }
			traj(["scenario", "apply", name, "--file", "-", "--decimal", "--json"], plan)
			const command = ["scenario", "tax", name, "--tax", "th-2026", "--filing-status", "single"]
			traj([...command, "--label", "side-gig=income.section40_1", "--json"])
			expect(unlabelledIncome(storedPlan(name).document)).toEqual([])
			traj([
				"scenario",
				"tax",
				name,
				"--merge",
				"--children",
				"1",
				"--label",
				"side-gig=income.section40_2",
				"--json",
			])
			const merged = JSON.parse(traj(["scenario", "show", "--json", "--", name])) as {
				scenario: { tax: TaxProfile }
			}
			expect(merged.scenario.tax.children).toBe(1)
			traj(["scenario", "tax", name, "--none", "--json"])
			expect(unlabelledIncome(storedPlan(name).document)).toEqual(["side-gig"])
		},
	)
})
