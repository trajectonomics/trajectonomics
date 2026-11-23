import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import type { AccountList, ProjectionRun, Read } from "../../lib/contract"
import { cashflowRunFixture } from "../../lib/view/cashflow/fixtures.test-support"
import { projectionRunFixture } from "../../lib/view/projection/fixtures.test-support"
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

function renderView(projections: Readonly<Record<string, Read<ProjectionRun>>>, year = ""): string {
	return render(CashFlowView, {
		props: {
			projections,
			accounts: ACCOUNTS,
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
})
