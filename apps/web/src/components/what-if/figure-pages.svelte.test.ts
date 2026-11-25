import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { preferences } from "../../client/preferences.svelte.js"
import { whatIfSession } from "../../client/what-if.svelte.js"
import { fakeServer, HASH, held, settle, useSessionHooks } from "../../client/what-if.test-support"
import { baselineChance, baselineRun } from "../../lib/view/what-if/baseline"
import {
	DEMO,
	DEMO_COMPARE,
	demoLens,
	statedCompare,
} from "../../lib/view/what-if/fixtures.test-support"
import CashFlowView from "../cashflow/CashFlowView.svelte"
import ChanceView from "../chance/ChanceView.svelte"
import FiSections from "../fi/FiSections.svelte"
import MilestonesView from "../milestones/MilestonesView.svelte"
import TaxPanel from "../tax/TaxPanel.svelte"
import OverviewWhatIf from "./OverviewWhatIf.svelte"

useSessionHooks()

/** The server's answer to a what-if: the demo's `retire-early` reads stand in for the what-if, with this compare. */
function answer(compare: unknown): unknown {
	return {
		ok: true,
		reads: {
			projection: DEMO.reads.projections["retire-early"],
			fi: DEMO.reads.fi["retire-early"],
			compare: { argv: [], ok: true, data: compare },
			chance: DEMO.reads.chance["retire-early"] ?? null,
		},
	}
}

/** Opens a session on `base` with one switch and answers its read, as the server would. */
async function openSession(compare: unknown = statedCompare()): Promise<void> {
	fakeServer()
	whatIfSession.setOff("base", HASH, "flows.rent", true)
	await settle()
	held[0]?.settle(200, answer(compare))
	await settle(50)
}

const projections = DEMO.reads.projections
const names = DEMO.params.scenarios
const run = { names, projections, scenario: "base", terms: "both", onTerms: () => {} }

describe("the Milestones page", () => {
	test("with no session it renders as it does today", () => {
		const body = render(MilestonesView, { props: run }).body
		expect(body).not.toContain("What-if on")
		expect(body).not.toContain("Baseline:")
	})

	test("with a session, a milestone reached only in the what-if reads not reached beside it", async () => {
		await openSession()
		const body = render(MilestonesView, { props: run }).body
		expect(body).toContain("What-if on base")
		expect(body).toContain("sabbatical")
		expect(body).toContain("1 Feb 2041")
		expect(body).toContain("Not reached")
		expect(body).toContain("−3 months, earlier")
		expect(body).toContain("No change")
	})

	test("a page on another plan shows no what-if: the session belongs to its own plan", async () => {
		await openSession()
		const body = render(MilestonesView, { props: { ...run, scenario: "retire-early" } }).body
		expect(body).not.toContain("What-if on")
	})

	test("a compare with null months says there is no change figure, with its reason in view", async () => {
		await openSession(DEMO_COMPARE)
		const body = render(MilestonesView, { props: run }).body
		expect(body).toContain("No change figure")
		expect(body).toContain('<span class="block max-w-64 text-xs">Neither side reaches it</span>')
	})

	test("a what-if read that failed keeps the baseline and shows no panel", async () => {
		fakeServer()
		whatIfSession.setOff("base", HASH, "flows.rent", true)
		await settle()
		held[0]?.settle(200, {
			...(answer(statedCompare()) as object),
			reads: {
				...(answer(statedCompare()) as { reads: object }).reads,
				compare: { argv: [], ok: false, error: { code: "x", exitCode: 1, message: "no" } },
			},
		})
		await settle(50)
		const body = render(MilestonesView, { props: run }).body
		expect(body).not.toContain("What-if on")
		expect(body).toContain("Net worth by year")
	})
})

describe("the FI date, the chance, the tax and the cash flow", () => {
	test("each page shows the what-if beside the baseline on the session's plan only", async () => {
		await openSession()
		const fi = render(FiSections, { props: { fi: DEMO.reads.fi } }).body
		expect(fi).toContain("What-if on base")
		expect(fi).toContain("−3 months, earlier")
		expect(fi.match(/What-if on/g)).toHaveLength(1)

		const chance = render(ChanceView, {
			props: { names, chance: DEMO.reads.chance, scenario: "base", onScenario: () => {} },
		}).body
		expect(chance).toContain("What-if on base")
		expect(chance).toMatch(/Chance of success from \d+\.\d\d% to \d+\.\d\d%/)

		const tax = render(TaxPanel, {
			props: { names, projections, requested: "base", onScenario: () => {} },
		}).body
		expect(tax).toContain("What-if on base")
		expect(tax).toContain("Baseline:")
		expect(tax).toContain("The Levy each year")

		const cash = render(CashFlowView, {
			props: {
				names,
				projections,
				scenario: "base",
				year: "",
				onYear: () => {},
			},
		}).body
		expect(cash).toContain("What-if on base")
		expect(cash).toContain("money in")
	})

	test("with no session none of them shows a what-if", () => {
		for (const body of [
			render(FiSections, { props: { fi: DEMO.reads.fi } }).body,
			render(ChanceView, {
				props: { names, chance: DEMO.reads.chance, scenario: "base", onScenario: () => {} },
			}).body,
			render(TaxPanel, { props: { names, projections, requested: "base", onScenario: () => {} } })
				.body,
		]) {
			expect(body).not.toContain("What-if on")
		}
	})
})

describe("the Overview's what-if", () => {
	const lens = demoLens(statedCompare())
	const props = {
		lens,
		baseline: baselineRun(DEMO, "base"),
		baselineChance: baselineChance(DEMO, "base"),
	}

	test("shows the headline figures, the chart with both lines and the year table's changes", () => {
		const body = render(OverviewWhatIf, { props }).body
		expect(body).toContain("What-if on base")
		expect(body).toContain("FI date")
		expect(body).toContain("−3 months, earlier")
		expect(body).toContain("+2 years, later")
		expect(body).toContain("Closing net worth")
		expect(body).toMatch(/\+<span[^>]*><span>5,000\.00<\/span>.*?, higher/s)
		expect(body).toContain("What-if: Nominal net worth")
		expect(body).toContain("Baseline: Nominal net worth")
		expect(body).toContain("Baseline:")
		expect(body).toContain("Chance of success from")
	})

	test("Hide amounts masks the what-if value, the baseline and the change", () => {
		preferences.hidden = true
		try {
			const body = render(OverviewWhatIf, { props }).body
			expect(body).not.toContain("1,749,616.72")
			expect(body).not.toContain("1,744,616.72")
			expect(body).not.toContain("5,000.00")
			expect(body).toContain("amount hidden")
		} finally {
			preferences.hidden = false
		}
	})

	test("is within a phone's width: no fixed width wider than the page", () => {
		const body = render(OverviewWhatIf, { props }).body
		expect(body).not.toMatch(/w-\[\d{4,}px\]/)
		// The year table's wrapper scrolls and is `relative`, so its screen-reader-only labels stay inside it.
		expect(body).toMatch(/class="relative [^"]*overflow-auto/)
	})
})

describe("the session's reads on the pages", () => {
	test("a page shows the what-if only for the changes it was read for: a newer change hides the older answer", async () => {
		await openSession()
		expect(whatIfSession.lensFor("base")).not.toBeNull()
		whatIfSession.setOff("base", HASH, "flows.living", true)
		expect(whatIfSession.lensFor("base")).toBeNull()
		await settle()
		held[1]?.settle(200, answer(statedCompare()))
		await settle(50)
		expect(whatIfSession.lensFor("base")?.plan).toBe("base")
		expect(whatIfSession.lensFor("retire-early")).toBeNull()
	})

	test("reverting the session removes the what-if from every page", async () => {
		await openSession()
		whatIfSession.revert()
		expect(whatIfSession.lensFor("base")).toBeNull()
		expect(render(MilestonesView, { props: run }).body).not.toContain("What-if on")
	})
})
