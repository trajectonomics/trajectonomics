import { describe, expect, test } from "bun:test"
import { createRawSnippet } from "svelte"
import { render } from "svelte/server"
import { baselineRead, planDocument } from "../../lib/view/plan-items/fixtures.test-support"
import { flowDraftOf } from "../../lib/view/plan-items/flows"
import { shownProblems } from "../../lib/view/plan-items/problems"
import Drawer from "../ui/Drawer.svelte"
import FlowFields from "./FlowFields.svelte"
import ItemActions from "./ItemActions.svelte"
import PlanItemsList from "./PlanItemsList.svelte"

const NO_PROBLEMS = { at: () => undefined, general: undefined }
const HASH = "jcs1:sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

function list(
	kind: "income" | "expense" | "assets",
	options: { editable?: boolean; flows?: boolean } = {},
): string {
	const doc = options.flows === false ? { ...planDocument(), flows: [] } : planDocument()
	return render(PlanItemsList, {
		props: {
			kind,
			name: "base",
			doc,
			household: null,
			baseline: baselineRead(),
			editable: options.editable ?? true,
			contentHash: HASH,
		},
	}).body
}

describe("the household's anchored dates on the planner pages", () => {
	test("a card shows the label of a date the household pins, beside the date", () => {
		const household = {
			schemaVersion: 1 as const,
			people: [{ id: "me", role: "holder" as const, born: "1990-06", lifeExpectancy: 90 }],
			anchors: [{ path: "flows.salary.end", person: "me", age: 60 }],
		}
		const body = render(PlanItemsList, {
			props: {
				kind: "income",
				name: "base",
				doc: planDocument(),
				household,
				baseline: baselineRead(),
				editable: true,
				contentHash: HASH,
			},
		}).body
		expect(body).toContain("at me, age 60")
	})

	test("the Flow form disables a pinned date and links to the household card", () => {
		const salary = planDocument().flows.find((flow) => flow.id === "salary")
		const body = render(FlowFields, {
			props: {
				draft: flowDraftOf(salary),
				kind: "income",
				existing: salary,
				shown: NO_PROBLEMS,
				name: "base",
				anchors: { start: null, end: "at me, age 60" },
			},
		}).body
		expect(body).toMatch(/<input[^>]*id="flow-end"[^>]*disabled/)
		expect(body).not.toMatch(/<input[^>]*id="flow-start"[^>]*disabled/)
		expect(body).toContain('href="/projection/?scenario=base#household"')
	})
})

describe("the Income page's list", () => {
	test("shows each income Flow as a card with its amount, its frequency, its growth and whether it is earned", () => {
		const body = list("income")
		expect(body).toContain("salary")
		expect(body).toContain("90,000.00")
		expect(body).toContain("monthly")
		expect(body).toContain("Follows inflation")
		expect(body).toContain("Earned")
		expect(body).toContain("Passive")
		expect(body).toContain("Plan base")
	})

	test("a computed Flow reads computed and has no Edit control", () => {
		const body = list("income")
		expect(body).toContain("computed")
		expect(body).not.toContain('aria-label="Edit tax-refund"')
		expect(body).toContain('aria-label="Edit salary"')
	})

	test("offers Add and Edit controls only when the server answers Edits", () => {
		const addButton = /<button[^>]*>\s*Add income\s*<\/button>/
		expect(list("income")).toMatch(addButton)
		const read = list("income", { editable: false })
		expect(read).not.toMatch(addButton)
		expect(read).not.toContain('aria-label="Edit salary"')
	})

	test("says so when the plan has no income, and the drawer is shut", () => {
		const body = list("income", { flows: false })
		expect(body).toContain("No income in this plan")
		expect(body).not.toContain("Amount per occurrence")
	})
})

describe("the Expenses and Assets and debts lists", () => {
	test("the expense list shows the expenses, with a fixed growth as a percent a year", () => {
		const body = list("expense")
		expect(body).toContain("rent")
		expect(body).toContain("3.00% a year")
		expect(body).not.toContain("salary")
	})

	test("the accounts show their rate, lock, compounding and Baseline balance, or none", () => {
		const body = list("assets")
		expect(body).toContain("1.00%")
		expect(body).toContain("Locked until")
		expect(body).toContain("2030-01-01")
		expect(body).toContain("5.00%, monthly")
		expect(body).toContain("662,300.00")
		expect(body).toContain("no balance")
		expect(body).toContain("Debt")
	})
})

describe("the form in the drawer", () => {
	test("shows the CLI's refusal of the amount at the amount field", () => {
		const salary = planDocument().flows[0]
		const shown = shownProblems(
			{},
			{
				code: "INVALID_AMOUNT",
				exitCode: 3,
				message: "Too many decimal places.",
				path: "document.flows.salary.amount",
			},
			"Too many decimal places.",
			["amount"],
		)
		const body = render(FlowFields, {
			props: {
				draft: flowDraftOf(salary),
				kind: "income",
				existing: salary,
				shown,
				name: "base",
				anchors: { start: null, end: null },
			},
		}).body
		expect(body).toContain('aria-invalid="true"')
		expect(body).toContain("Too many decimal places.")
		expect(body).toContain("Earned income")
	})

	test("a new Flow asks for its name, and shows no problem until the form finds one", () => {
		const body = render(FlowFields, {
			props: {
				draft: flowDraftOf(),
				kind: "expense",
				shown: NO_PROBLEMS,
				name: "base",
				anchors: { start: null, end: null },
			},
		}).body
		expect(body).toContain('for="flow-name"')
		expect(body).not.toContain("Earned income")
		expect(body).not.toContain('role="alert"')
	})

	test("an existing item's Delete asks first, and a new one has no Delete", () => {
		const withDelete = render(ItemActions, {
			props: { id: "salary", onDelete: () => {} },
		}).body
		expect(withDelete).toContain(">Save<")
		expect(withDelete).not.toContain("Delete salary from this plan?")
		const noDelete = render(ItemActions, { props: { onDelete: () => {} } }).body
		expect(noDelete).not.toContain("Delete")
	})
})

describe("the Drawer", () => {
	test("is a labelled dialog with a close control, and shows its children when open", () => {
		const children = createRawSnippet(() => ({ render: () => "<p>the form</p>" }))
		const body = render(Drawer, {
			props: { open: true, title: "Edit salary", onClose: () => {}, children },
		}).body
		expect(body).toContain("<dialog")
		expect(body).toContain('aria-labelledby="drawer-title"')
		expect(body).toContain("Edit salary")
		expect(body).toContain("Close the drawer")
		expect(body).toContain("the form")
	})
})
