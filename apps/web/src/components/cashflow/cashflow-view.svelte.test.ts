import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { snapshotLoader } from "../../client/browser"
import { replaceSnapshot } from "../../client/snapshot.svelte"
import type { AccountList, ProjectionRun, Read } from "../../lib/contract"
import { cashflowRunFixture } from "../../lib/view/cashflow/fixtures.test-support"
import { projectionRunFixture } from "../../lib/view/projection/fixtures.test-support"
import { LOADING } from "../../lib/view/state"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import CashFlowView from "./CashFlowView.svelte"

const ARGV = ["projection", "run", "--scenario", "base", "--breakdown", "--json"]
const ACCOUNTS: Read<AccountList> = {
	argv: ["account", "list", "--json"],
	ok: true,
	data: {
		accounts: [
			{
				id: "acc-bank",
				name: "Bank",
				type: "asset",
				currency: "THB",
				parentId: null,
				archivedAt: null,
				version: 1,
				createdAt: "2026-10-31T00:00:00Z",
				updatedAt: "2026-10-31T00:00:00Z",
			},
		],
	},
}

// The page reads the ledger names from the Snapshot it shows.
beforeEach(() => replaceSnapshot({ ...DEMO, reads: { ...DEMO.reads, accounts: ACCOUNTS } }))
afterAll(() => snapshotLoader.replace(LOADING))

function renderView(projections: Readonly<Record<string, Read<ProjectionRun>>>, year = ""): string {
	return render(CashFlowView, {
		props: {
			names: Object.keys(projections),
			projections,
			scenario: "base",
			year,
			onYear: () => {},
		},
	}).body
}

const okRun = (run: ProjectionRun): Read<ProjectionRun> => ({ argv: ARGV, ok: true, data: run })

describe("CashFlowView", () => {
	test("shows a year picker, a flow diagram, and a table of the year's lines and totals", () => {
		const body = renderView({ base: okRun(cashflowRunFixture()) })
		expect(body).toContain('name="year"')
		expect(body).toContain("<svg")
		expect(body).toContain('role="group"')
		expect(body).toContain("Each line of the year")
		expect(body).toContain("money in")
		expect(body).toContain("124,500.00")
	})

	test("the first year is the one shown when the address names none", () => {
		const body = renderView({ base: okRun(cashflowRunFixture()) })
		expect(body).toMatch(/<option value="0"[^>]*selected/)
	})

	test("a year the address names is the one shown", () => {
		const body = renderView({ base: okRun(cashflowRunFixture()) }, "1")
		expect(body).toMatch(/<option value="1"[^>]*selected/)
	})

	test("the hidden table sits inside an sr-only div, which is what the page clips", () => {
		const body = renderView({ base: okRun(cashflowRunFixture()) })
		expect(body).toMatch(/<div class="sr-only">\s*<table>/)
	})

	test("the diagram's labels are hidden from a screen reader, which reads the bands and the table", () => {
		const body = renderView({ base: okRun(cashflowRunFixture()) })
		expect(body).toContain("<text")
		expect(body.match(/<text /g)?.length).toBe(body.match(/<text [^>]*aria-hidden="true"/g)?.length)
	})

	test("a Snapshot without the cash flow table says so, and draws no diagram", () => {
		const body = renderView({ base: okRun(projectionRunFixture()) })
		expect(body).toContain("No cash flow for base")
		expect(body).not.toContain("<svg")
	})

	test("a failed Read shows the CLI's own message, not a diagram", () => {
		const failed: Read<ProjectionRun> = {
			argv: ARGV,
			ok: false,
			error: { code: "NOPE", exitCode: 1, message: "no such Scenario" },
		}
		const body = renderView({ base: failed })
		expect(body).toContain("no such Scenario")
		expect(body).not.toContain("<svg")
	})

	test("the wide diagram is for a medium screen and up, and the stacked one for a phone, so neither scrolls sideways", () => {
		const body = renderView({ base: okRun(cashflowRunFixture()) })
		// Two diagrams and the one zero-size probe both measure through, outside both breakpoint wrappers.
		expect(body.match(/<svg/g)?.length).toBe(3)
		expect(body).toMatch(/class="max-w-full overflow-x-auto[^"]*hidden md:block"/)
		expect(body).toMatch(/class="[^"]*md:hidden"/)
		// The stacked one has no minimum width and no scroll box of its own.
		const stacked = body.slice(body.indexOf("md:hidden"), body.indexOf('<div class="sr-only">'))
		expect(stacked).not.toContain("min-w-")
		expect(stacked).not.toContain("overflow-x")
	})

	test("the stacked diagram names every band of the year and shows each CLI figure, grouped, once", () => {
		const body = renderView({ base: okRun(cashflowRunFixture()) })
		const stacked = body.slice(body.indexOf("md:hidden"), body.indexOf('<div class="sr-only">'))
		expect(stacked).toContain("Where it comes from")
		expect(stacked).toContain("Where it goes")
		// Year zero's sources and uses, from the CLI's lines and totals rows with no arithmetic: the figures
		// are the lines' own amounts, grouped. The refund shows with its sign taken off, as in the wide diagram.
		for (const amount of ["120,000.00", "1,800.00", "3,000.00", "1,500.00"]) {
			expect(stacked).toContain(`>${amount}<`)
		}
		for (const amount of [
			"6,000.00",
			"30,000.00",
			"18,000.00",
			"36,000.00",
			"28,800.00",
			"4,800.00",
		]) {
			expect(stacked).toContain(`>${amount}<`)
		}
		// Each bar is a control with the name and the amount, and picks the same row as the wide one.
		expect(stacked).toContain('aria-label="Salary, 120,000.00"')
		expect(stacked.match(/role="button"/g)?.length).toBe(
			body.slice(0, body.indexOf("md:hidden")).match(/role="button"/g)?.length ?? -1,
		)
	})

	test("a Flow the plan labels is named so in the bands' accessible names and in the table", () => {
		const base = structuredClone(DEMO)
		const doc = base.reads.documents["base"]
		if (doc?.ok !== true) throw new Error("the Demo reads base")
		const salary = doc.data.scenario.document.flows.find((flow) => flow.id === "salary")
		if (salary === undefined) throw new Error("the Demo earns a salary")
		salary.displayLabel = "Your salary"
		replaceSnapshot({ ...base, reads: { ...base.reads, accounts: ACCOUNTS } })
		const body = renderView({ base: okRun(cashflowRunFixture()) })
		// The chart's labels are text: a bar's accessible name carries the plan's words, not the id.
		expect(body).toContain('aria-label="Your salary, 120,000.00"')
		expect(body).toContain(">Your salary</span>")
		expect(body).not.toContain('aria-label="salary, 120,000.00"')
	})

	test("a Flow the plan does not label keeps its id, in code, and in the bar's accessible name", () => {
		const base = structuredClone(DEMO)
		const doc = base.reads.documents["base"]
		if (doc?.ok !== true) throw new Error("the Demo reads base")
		const salary = doc.data.scenario.document.flows.find((flow) => flow.id === "salary")
		if (salary === undefined) throw new Error("the Demo earns a salary")
		delete salary.displayLabel
		replaceSnapshot({ ...base, reads: { ...base.reads, accounts: ACCOUNTS } })
		const body = renderView({ base: okRun(cashflowRunFixture()) })
		expect(body).toContain('aria-label="salary, 120,000.00"')
		expect(body).toMatch(/<code[^>]*data-item="salary"[^>]*>salary<\/code>/)
	})

	test("the stacked diagram of a Shortfall year draws its unmet money, and the page keeps one table for a screen reader", () => {
		const body = renderView({ base: okRun(cashflowRunFixture()) }, "1")
		const stacked = body.slice(body.indexOf("md:hidden"), body.indexOf('<div class="sr-only">'))
		expect(stacked).toContain(">500.00<")
		expect(body.match(/<div class="sr-only">/g)?.length).toBe(1)
	})

	test("a focused band shows its ring: a stacked bar follows its group's focus, and a wide band draws its own stroke", () => {
		const body = renderView({ base: okRun(cashflowRunFixture()) })
		const stacked = body.slice(body.indexOf("md:hidden"), body.indexOf('<div class="sr-only">'))
		// The group is the focusable control, so the bar it holds reads the group's focus-visible state.
		expect(stacked).toContain('class="group cursor-pointer outline-none hover:opacity-85"')
		expect(stacked).toContain("group-focus-visible:stroke-ring group-focus-visible:stroke-2")
		// The wide band is itself focusable, so its ring is its own stroke, not an outline SVG does not draw.
		expect(body).toContain("hover:opacity-85 focus-visible:stroke-ring focus-visible:stroke-2")
	})

	test("the table's scroll box is a containing block, so the masked amount's screen-reader span cannot widen the page", () => {
		const body = renderView({ base: okRun(cashflowRunFixture()) })
		expect(body).toMatch(
			/<div class="relative max-w-full overflow-x-auto rounded-lg border border-border">\s*<table/,
		)
	})
})
