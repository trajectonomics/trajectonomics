// The tax labels against the real traj (web ADR 0008 and 0016): a Flow id the page makes (Thai script) labelled in the whole
// write, a taxed plan whose income Flow carries a label `traj` does not know, and the not-stated list of a plan with
// retirement contributions. Each test sets up its own state, so each passes alone.
import { afterAll, beforeAll, describe, expect } from "bun:test"
import type { TaxAllowances } from "../src/lib/contract"
import { blankDraft } from "../src/lib/view/tax-settings/draft"
import { labelEdit } from "../src/lib/view/tax-settings/label-edit"
import { unlabelledIncome } from "../src/lib/view/tax-settings/labels"
import { notStated } from "../src/lib/view/tax-settings/not-stated"
import { taxEdit } from "../src/lib/view/tax-settings/profile-edit"
import { flowsSentence } from "../src/lib/view/tax-settings/refusal"
import { SLOW_MS } from "./edit-fixture.test-support"
import { slow } from "./estate.test-support"
import { disposeEstate, post, setupEstate, storedPlan, traj } from "./estate-ledger.test-support"
import { bare, income, reported, taxedSalary } from "./tax-cards.test-support"

beforeAll(async () => {
	await setupEstate()
}, SLOW_MS)
afterAll(disposeEstate)

/** Stores a document under a name, as `scenario apply` takes it. */
function store(name: string, document: object): void {
	traj(["scenario", "apply", name, "--file", "-", "--decimal", "--json"], document)
}

describe("the tax labels through traj", () => {
	slow("an untaxed plan whose income Flow has a Thai id is taxed from the page", async () => {
		const name = "thai-id"
		const id = "เงินเดือน"
		const document = bare()
		store(name, { ...document, flows: [...document.flows, income(id)] })
		const plan = storedPlan(name)
		expect(unlabelledIncome(plan.document)).toEqual([id])
		const whole = taxEdit(
			{ name, contentHash: plan.hash, origin: null, unlabelled: [id] },
			{ ...blankDraft(), filingStatus: "single" },
			true,
			{ [id]: "income.section40_1" },
		)
		if (!whole.ok) throw new Error("the draft makes an Edit")
		const ran = await post("edit", whole.edit)
		if (!ran.ok) throw new Error(ran.error.message)
		const stored = storedPlan(name).document
		expect(stored.flows.find((flow) => flow.id === id)?.label).toBe("income.section40_1")
		expect(unlabelledIncome(stored)).toEqual([])
	})

	slow(
		"an income Flow with a label `traj` does not know is offered the Tax labels form, and a save then a card Edit succeed",
		async () => {
			const name = "unknown-label"
			taxedSalary(name)
			const grown = storedPlan(name)
			store(name, {
				...grown.document,
				flows: [...grown.document.flows, { ...income("bonus"), label: "income.section40_9" }],
			})
			expect(unlabelledIncome(storedPlan(name).document)).toEqual(["bonus"])
			const merge = (hash: string) => ({
				kind: "merge-tax",
				name,
				contentHash: hash,
				flags: { children: "1" },
			})
			const refused = await post("edit", merge(storedPlan(name).hash))
			if (refused.ok) throw new Error("the CLI merged over a Flow with an unknown label")
			expect(flowsSentence(refused.error)).toContain("bonus")
			const plan = storedPlan(name)
			const edit = labelEdit(
				{ name, contentHash: plan.hash, plan: plan.document },
				{ flow: "bonus", label: "income.section40_2" },
			)
			if (!edit.ok) throw new Error("the draft makes an Edit")
			const saved = await post("edit", edit.edit)
			if (!saved.ok) throw new Error(saved.error.message)
			expect(unlabelledIncome(storedPlan(name).document)).toEqual([])
			const card = await post("edit", merge(storedPlan(name).hash))
			if (!card.ok) throw new Error(card.error.message)
		},
	)

	slow(
		"the not-stated list matches `traj` for a plan with an RMF and a ThaiESG contribution Flow",
		async () => {
			const fund = storedPlan().document.accounts[1]?.id
			if (fund === undefined) throw new Error("the plan has a fund")
			const contribution = (id: string, label: string) => ({
				id,
				kind: "contribution",
				target: fund,
				frequency: "monthly",
				start: "2026-01-01",
				amount: "1000.00",
				growth: { bps: 0 },
				label,
			})
			const variants: Record<string, [string, string][]> = {
				neither: [],
				rmf: [["rmf", "allowance.retirement.rmf"]],
				esg: [["esg", "allowance.thai_esg"]],
				both: [
					["rmf", "allowance.retirement.rmf"],
					["esg", "allowance.thai_esg"],
				],
			}
			for (const [variant, pairs] of Object.entries(variants)) {
				const name = `retire-${variant}`
				taxedSalary(name)
				const base = storedPlan(name)
				const flows = pairs.map(([id, label]) => contribution(id, label))
				const cashflow = base.document["cashflow"] as { contribute?: string[] } | undefined
				store(name, {
					...base.document,
					cashflow: { ...cashflow, contribute: [...(cashflow?.contribute ?? []), fund] },
					flows: [...base.document.flows, ...flows],
				})
				const shown = JSON.parse(traj(["scenario", "show", "--json", "--", name])) as {
					scenario: { taxAllowances?: TaxAllowances }
				}
				expect(shown.scenario.taxAllowances).toEqual(reported(name))
				const page = notStated(shown.scenario.taxAllowances).map((one) => one.class)
				expect(page).toEqual(reported(name).notStated)
				// The labels are read: a class a Flow states is not in the list, and one it does not is.
				expect(page.includes("retirementContributions")).toBe(!pairs.some(([id]) => id === "rmf"))
				expect(page.includes("thaiEsg")).toBe(!pairs.some(([id]) => id === "esg"))
			}
		},
	)
})
