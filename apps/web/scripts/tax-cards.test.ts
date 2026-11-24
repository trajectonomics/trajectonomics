// The grouped tax cards against the real traj (web ADR 0016): a child added with a merge changes the tax per year the page
// shows, the classes `scenario tax` reports are all placed and the not-stated list is the one `traj` reports, and the tax label
// form's Edit gives an income Flow its label. Each test sets up its own state, so each passes alone.
import { afterAll, beforeAll, describe, expect } from "bun:test"
import type { ScenarioDocument, TaxProfile } from "../src/lib/contract"
import { TAX_FLAG_KEYS } from "../src/lib/edit/tax-flags"
import { taxRows } from "../src/lib/view/tax"
import { blankDraft } from "../src/lib/view/tax-settings/draft"
import { GROUPS, PLACE, TAX_CLASSES } from "../src/lib/view/tax-settings/groups"
import { INCOME_LABELS } from "../src/lib/view/tax-settings/label-choices"
import { labelEdit, labelShown } from "../src/lib/view/tax-settings/label-edit"
import { unlabelledIncome } from "../src/lib/view/tax-settings/labels"
import { notStated } from "../src/lib/view/tax-settings/not-stated"
import { taxEdit } from "../src/lib/view/tax-settings/profile-edit"
import { SLOW_MS } from "./edit-fixture.test-support"
import { runOf, slow } from "./estate.test-support"
import {
	disposeEstate,
	PLAN,
	post,
	setupEstate,
	storedPlan,
	traj,
} from "./estate-ledger.test-support"
import { send, shownTax, withProfile } from "./tax-settings.test-support"

beforeAll(async () => {
	await setupEstate()
}, SLOW_MS)
afterAll(disposeEstate)

/** What `scenario tax --from-stored --dry-run` reports for a plan: its own classes, stated and not. */
function reported(name: string): { stated: string[]; notStated: string[] } {
	const out = traj(["scenario", "tax", name, "--from-stored", "--dry-run", "--json"])
	return (JSON.parse(out) as { allowances: { stated: string[]; notStated: string[] } }).allowances
}

const owedByYear = (answer: Awaited<ReturnType<typeof post>>) =>
	taxRows(runOf(answer).taxYears).map((row) => row.owed)

/** An income Flow of 100,000.00 a month, with no tax label. */
const income = (id: string) => ({
	id,
	kind: "income",
	frequency: "monthly",
	start: "2026-01-01",
	amount: "100000.00",
	growth: { bps: 0 },
	earned: true,
})

/** The plan's document with no tax rules, no tax label and no income Flow of the tests: a plan with no tax. */
function bare(name = PLAN): ScenarioDocument {
	const { levies: _levies, ...document } = storedPlan(name).document
	const flows = document.flows
		.filter((flow) => flow.id !== "salary" && flow.id !== "side-gig")
		.map(({ label: _label, ...flow }) => flow)
	return { ...document, flows }
}

/** Gives the plan a salary and taxes it, so the projection has tax years: a Levy reads a label some Flow carries. */
function taxedSalary(name = PLAN, from = PLAN): void {
	const document = bare(from)
	const flows = [...document.flows, income("salary")]
	traj(["scenario", "apply", name, "--file", "-", "--decimal", "--json"], { ...document, flows })
	traj([
		"scenario",
		"tax",
		name,
		"--tax",
		"th-2026",
		"--filing-status",
		"single",
		"--label",
		"salary=income.section40_1",
		"--json",
	])
}

describe("the tax cards through traj", () => {
	slow("adding a child with a merge changes the tax per year the page shows", async () => {
		taxedSalary()
		const before = owedByYear(await send("merge-tax", { children: "1" }))
		expect(before.length).toBeGreaterThan(0)
		const after = owedByYear(await send("merge-tax", { children: "3" }))
		expect(after).toHaveLength(before.length)
		expect(after).not.toEqual(before)
		// Every figure is the CLI's text: the page reads the same rows from the same read.
		expect(owedByYear(await post("reread", {}))).toEqual(after)
	})

	slow(
		"every class `scenario tax` reports has a place, and the card groups hold every flag",
		async () => {
			taxedSalary()
			await withProfile()
			const answer = reported(PLAN)
			const classes = [...answer.stated, ...answer.notStated].sort()
			expect(classes).toEqual([...TAX_CLASSES].sort())
			for (const klass of classes) expect(PLACE[klass as keyof typeof PLACE]).toBeDefined()
			expect(GROUPS.flatMap((group) => group.items).sort()).toEqual([...TAX_FLAG_KEYS].sort())
		},
	)

	slow("the not-stated list is the one `traj` reports for the stored profile", async () => {
		taxedSalary()
		await withProfile()
		const names = (profile: TaxProfile) =>
			notStated(profile, storedPlan().document).map((one) => one.class)
		const first = shownTax(await post("reread", {})).tax
		if (first === null) throw new Error("the profile is stored")
		expect(names(first)).toEqual(reported(PLAN).notStated as never)
		const next = shownTax(
			await send("merge-tax", { socialSecurity: "9000", donation2x: "100", parents: "1" }),
		).tax
		if (next === null) throw new Error("the profile is stored")
		expect(names(next)).toEqual(reported(PLAN).notStated as never)
		expect(names(next)).not.toContain("parents")
	})

	slow("the labels the form offers are the income labels `traj` lists", async () => {
		const help = traj(["scenario", "tax", "--help"]).replace(/\s+/g, " ")
		const income = /An income Flow takes one of (.*?)\. A contribution Flow/.exec(help)
		expect(INCOME_LABELS.map((choice) => choice.value)).toEqual(income?.[1]?.split(", ") ?? [])
	})

	slow(
		"a plan with no tax cannot be labelled by apply, so the refusal lands at the label field; the whole write labels it",
		async () => {
			const name = "unlabelled-cards"
			const document = bare()
			traj(["scenario", "apply", name, "--file", "-", "--decimal", "--json"], {
				...document,
				flows: [...document.flows, income("side-gig")],
			})
			const plan = storedPlan(name)
			const edit = labelEdit(
				{ name, contentHash: plan.hash, plan: plan.document },
				{ flow: "side-gig", label: "income.section40_2" },
			)
			if (!edit.ok) throw new Error("the draft makes an Edit")
			const refused = await post("edit", edit.edit)
			if (refused.ok) throw new Error("the CLI labelled a plan with no Levy")
			const shown = labelShown({}, refused.error, refused.error.message)
			expect(shown.at("label")).toBe(refused.error.message)
			const whole = taxEdit(
				{ name, contentHash: plan.hash, origin: null, unlabelled: unlabelledIncome(plan.document) },
				{ ...blankDraft(), filingStatus: "single" },
				true,
				{ "side-gig": "income.section40_2" },
			)
			if (!whole.ok) throw new Error("the draft makes an Edit")
			const ran = await post("edit", whole.edit)
			if (!ran.ok) throw new Error(ran.error.message)
			expect(unlabelledIncome(storedPlan(name).document)).toEqual([])
			expect(storedPlan(name).document.flows.find((flow) => flow.id === "side-gig")?.label).toBe(
				"income.section40_2",
			)
		},
	)

	slow(
		"the label form's Edit labels a Flow added to a taxed plan, and the stored profile stays",
		async () => {
			const name = "labelled-later"
			taxedSalary(name)
			const grown = storedPlan(name)
			traj(["scenario", "apply", name, "--file", "-", "--decimal", "--json"], {
				...grown.document,
				flows: [...grown.document.flows, income("side-gig")],
			})
			expect(unlabelledIncome(storedPlan(name).document)).toEqual(["side-gig"])
			const plan = storedPlan(name)
			const edit = labelEdit(
				{ name, contentHash: plan.hash, plan: plan.document },
				{ flow: "side-gig", label: "income.section40_2" },
			)
			if (!edit.ok) throw new Error("the draft makes an Edit")
			const ran = await post("edit", edit.edit)
			if (!ran.ok) throw new Error(ran.error.message)
			expect(unlabelledIncome(storedPlan(name).document)).toEqual([])
			const shown = JSON.parse(traj(["scenario", "show", "--json", "--", name])) as {
				scenario: { tax: unknown }
			}
			expect(shown.scenario.tax).not.toBeNull()
		},
	)
})
