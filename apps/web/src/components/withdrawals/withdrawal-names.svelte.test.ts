import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import type { ProjectionRun } from "../../lib/contract"
import { type ItemNames, itemNames } from "../../lib/view/item-names"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import { withdrawalsView } from "../../lib/view/withdrawals"
import RuleYearsTable from "./RuleYearsTable.svelte"
import WithdrawalsResult from "./WithdrawalsResult.svelte"

/** The Demo's plan as a copy, so a test may give a Flow the label it needs. */
function run(): ProjectionRun {
	const read = DEMO.reads.projections["base"]
	if (read?.ok !== true) throw new Error("the Demo plans base")
	return structuredClone(read.data)
}

/** The plan's names: the Demo's own document, with the `displayLabel` a Flow gains in each entry of `labels`. */
function namesOf(labels: Record<string, string>): ItemNames {
	const read = DEMO.reads.documents["base"]
	if (read?.ok !== true) throw new Error("the Demo reads base")
	const doc = structuredClone(read.data.scenario.document)
	for (const [id, label] of Object.entries(labels)) {
		const flow = doc.flows.find((one) => one.id === id)
		if (flow === undefined) {
			doc.flows.push({
				id,
				kind: "expense",
				frequency: "monthly",
				start: "2026-10-31",
				displayLabel: label,
			})
		} else {
			flow.displayLabel = label
		}
	}
	return itemNames(new Map(), null, doc)
}

/** The Demo's run with a second spending rule, so two rule Flows may share a label. */
function twinView() {
	const data = run()
	const table = data.tables.find((one) => one.name === "spendingRules")
	if (table?.name !== "spendingRules") throw new Error("the Demo reads a spending rule")
	table.rows.push(...table.rows.map((row) => ({ ...row, flow: "retirement-spending-2" })))
	return withdrawalsView(data, null)
}

describe("the Withdrawals block names each rule Flow", () => {
	test("a labelled Flow shows its label in the heading and in the section's name", () => {
		const body = render(WithdrawalsResult, {
			props: {
				view: withdrawalsView(run(), null),
				terms: "both",
				names: namesOf({ "retirement-spending": "Retirement spending" }),
			},
		}).body
		expect(body).toContain('aria-label="Retirement spending year by year"')
		expect(body).toContain("Year by year:")
		expect(body).toContain(">Retirement spending</span>")
		expect(body).not.toContain("retirement-spending</code>")
	})

	test("a Flow the plan states no label for shows its id in code", () => {
		const body = render(WithdrawalsResult, {
			props: { view: withdrawalsView(run(), null), terms: "both", names: namesOf({}) },
		}).body
		expect(body).toMatch(
			/<code[^>]*data-item="retirement-spending"[^>]*>retirement-spending<\/code>/,
		)
		expect(body).toContain('aria-label="retirement-spending year by year"')
	})

	test("two rule Flows that share a label read the label and the id, so a person tells them apart", () => {
		const names = namesOf({
			"retirement-spending": "Retirement spending",
			"retirement-spending-2": "Retirement spending",
		})
		const body = render(WithdrawalsResult, {
			props: { view: twinView(), terms: "both", names },
		}).body
		expect(body).toContain('aria-label="Retirement spending (retirement-spending) year by year"')
		expect(body).toContain('aria-label="Retirement spending (retirement-spending-2) year by year"')
		expect(body).toContain(">Retirement spending (retirement-spending)</span>")
		expect(body).toContain(">Retirement spending (retirement-spending-2)</span>")
		expect(body).toContain("Retirement spending (retirement-spending), each year in THB")
		expect(body).toContain("Retirement spending (retirement-spending-2), each year in THB")
	})
})

describe("the Rule years table names its Flow in the caption", () => {
	const table = (names: ItemNames): string => {
		const view = withdrawalsView(run(), null)
		const rule = view.rules[0]
		if (rule === undefined) throw new Error("the Demo has a rule")
		return render(RuleYearsTable, {
			props: { rule, currency: view.currency, terms: "both", names },
		}).body
	}

	test("a labelled Flow reads its label", () => {
		expect(table(namesOf({ "retirement-spending": "Retirement spending" }))).toContain(
			"Retirement spending, each year in THB",
		)
	})

	test("an unlabelled Flow reads its id", () => {
		expect(table(namesOf({}))).toContain("retirement-spending, each year in THB")
	})
})
