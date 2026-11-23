import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { whatIfSession } from "../../client/what-if.svelte.js"
import { HASH, useSessionHooks } from "../../client/what-if.test-support"
import { baselineRead, planDocument } from "../../lib/view/plan-items/fixtures.test-support"
import PlanItemsList from "../plan-items/PlanItemsList.svelte"

useSessionHooks()

function list(kind: "income" | "expense" | "assets", name = "base"): string {
	return render(PlanItemsList, {
		props: {
			kind,
			name,
			doc: planDocument(),
			household: null,
			baseline: baselineRead(),
			editable: true,
			contentHash: HASH,
		},
	}).body
}

describe("the planner pages while a What-if session is open", () => {
	test("with no session a card shows the plan as stored, with nothing struck through", () => {
		const body = list("expense")
		expect(body).not.toContain("<s ")
		expect(body).not.toContain("Off in this what-if</p>")
	})

	test("an overridden amount shows the session's value, with the baseline's struck through and named", () => {
		whatIfSession.tryItem(
			"base",
			HASH,
			"flows",
			"rent",
			{ amount: "14000.00" },
			{ amount: "9000.00" },
		)
		const body = list("expense")
		expect(body).toContain("9,000.00")
		expect(body).toMatch(/<s [^>]*>.*Baseline:.*14,000\.00/s)
	})

	test("a changed growth shows the baseline's text struck through beside the session's", () => {
		whatIfSession.tryItem(
			"base",
			HASH,
			"flows",
			"rent",
			{ growth: { bps: 300 } },
			{ growth: { bps: 500 } },
		)
		const body = list("expense")
		expect(body).toContain("5.00% a year")
		expect(body).toMatch(/<s [^>]*>.*3\.00% a year/s)
	})

	test("a switched-off item is dimmed and says it is off in this what-if", () => {
		whatIfSession.setOff("base", HASH, "flows.rent", true)
		const body = list("expense")
		expect(body).toContain("opacity-60")
		expect(body).toContain('<p class="mt-1 text-sm font-medium">Off in this what-if</p>')
	})

	test("an Account's changed rate is struck through, and a switched-off Account is dimmed", () => {
		whatIfSession.tryItem("base", HASH, "accounts", "bank", { rate: 100 }, { rate: 250 })
		whatIfSession.setOff("base", HASH, "accounts.loan", true)
		const body = list("assets")
		expect(body).toContain("2.50%")
		expect(body).toMatch(/<s [^>]*>.*1\.00%/s)
		expect(body).toContain("opacity-60")
	})

	test("a page on another plan shows no mark: the session belongs to its own plan", () => {
		whatIfSession.setOff("base", HASH, "flows.rent", true)
		const body = list("expense", "retire-early")
		expect(body).not.toContain("opacity-60")
		expect(body).not.toContain("Off in this what-if</p>")
	})
})
