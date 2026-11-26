import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { snapshotLoader } from "../../client/browser"
import { preferences } from "../../client/preferences.svelte.js"
import { replaceSnapshot } from "../../client/snapshot.svelte"
import { whatIfSession } from "../../client/what-if.svelte.js"
import { HASH, openDemoSession, useSessionHooks } from "../../client/what-if.test-support"
import { LOADING } from "../../lib/view/state"
import { baselineChance, baselineRun } from "../../lib/view/what-if/baseline"
import { countChange, moneyChange } from "../../lib/view/what-if/change"
import { DEMO, demoLens, statedCompare } from "../../lib/view/what-if/fixtures.test-support"
import { startWhatIf, withSet } from "../../lib/what-if/session"
import NetWorthPage from "../pages/NetWorthPage.svelte"
import ChangeText from "./ChangeText.svelte"
import OverviewWhatIf from "./OverviewWhatIf.svelte"
import WhatIfChanges from "./WhatIfChanges.svelte"

useSessionHooks()

// The Snapshot store is shared by every test file in the process, so it is put back as it was.
afterAll(() => snapshotLoader.replace(LOADING))
beforeEach(() => replaceSnapshot(DEMO))
afterEach(() => {
	preferences.hidden = false
})

const WORDS = ["higher", "lower"] as const

/** What a hidden money change must not show: a sign, a direction, or the figure itself. */
function expectNoDirection(body: string): void {
	expect(body).not.toMatch(/higher|lower/)
	expect(body).not.toMatch(/\+<span|\+\d/)
	expect(body).not.toContain("−")
}

describe("Hide amounts and a money change", () => {
	test("a hidden increase says amount hidden, with no sign and no word", () => {
		preferences.hidden = true
		const body = render(ChangeText, { props: { change: moneyChange("5000.00", WORDS, "r") } }).body
		expect(body).toContain("amount hidden")
		expectNoDirection(body)
		expect(body).not.toContain("5,000")
	})

	test("a hidden decrease says the same, so the two cannot be told apart", () => {
		preferences.hidden = true
		const up = render(ChangeText, { props: { change: moneyChange("5000.00", WORDS, "r") } }).body
		const down = render(ChangeText, { props: { change: moneyChange("-1000.00", WORDS, "r") } }).body
		expect(down).toBe(up)
	})

	test("shown, the change keeps its sign and its words", () => {
		const body = render(ChangeText, { props: { change: moneyChange("-1000.00", WORDS, "r") } }).body
		expect(body).toContain("lower")
		expect(body).toContain("1,000.00")
		expect(body).not.toContain("amount hidden")
	})

	test("a change in months is not money: it keeps its sign and its words", () => {
		preferences.hidden = true
		const change = countChange(-3, "month", ["earlier", "later"], "r")
		const body = render(ChangeText, { props: { change } }).body
		expect(body).toContain("−3 months, earlier")
	})

	test("a figure page: the year table shows no direction and no amount", async () => {
		await openDemoSession("base")
		preferences.hidden = true
		const body = render(NetWorthPage, { props: { scenario: "base" } }).body
		expect(body).toContain("What-if on base")
		expect(body).toContain("amount hidden")
		expect(body).not.toContain("1,749,616.72")
		expect(body).not.toContain("5,000.00")
		expect(body).not.toMatch(/, (higher|lower)/)
		expect(body).not.toMatch(/\+<span/)
	})

	test("a card: the Home cards show no direction for a hidden fee or tax", () => {
		preferences.hidden = true
		const body = render(OverviewWhatIf, {
			props: {
				lens: demoLens(statedCompare()),
				baseline: baselineRun(DEMO, "base"),
				baselineChance: baselineChance(DEMO, "base"),
			},
		}).body
		expect(body).toContain("amount hidden")
		expect(body).not.toMatch(/, (higher|lower)/)
		expect(body).not.toMatch(/\+<span/)
		// A change in months is not money, and still names its direction.
		expect(body).toContain("−3 months, earlier")
	})
})

describe("Hide amounts and a tried Milestone date", () => {
	test("a startAt Set keeps the Milestone's name and is not masked", () => {
		const next = structuredClone(DEMO)
		const read = next.reads.documents["base"]
		if (read?.ok !== true) throw new Error("the Demo reads its base plan")
		read.data.scenario.document.milestones = [{ id: "retire", displayLabel: "Retirement" }]
		replaceSnapshot(next)
		whatIfSession.whatIf = withSet(startWhatIf("base", HASH), "flows.rent.startAt", "retire")
		preferences.hidden = true
		const body = render(WhatIfChanges, { props: {} }).body
		expect(body).toContain("set to Retirement")
		expect(body).not.toContain("amount hidden")
		expect(body).not.toContain("•••••")
	})
})

describe("Hide amounts and a tried Flow date", () => {
	test("a start date is printed as a date and not masked, with amounts shown or hidden", () => {
		whatIfSession.whatIf = withSet(startWhatIf("base", HASH), "flows.rent.start", "2027-03-01")
		for (const hidden of [false, true]) {
			preferences.hidden = hidden
			const body = render(WhatIfChanges, { props: {} }).body
			expect(body).toContain("1 Mar 2027")
			expect(body).not.toContain("2027-03-01")
			expect(body).not.toContain("amount hidden")
			expect(body).not.toContain("•••••")
		}
	})
})

describe("Hide amounts and a tried Account lock", () => {
	test("a lockedUntil Set is printed as a date and not masked, with amounts shown or hidden", () => {
		whatIfSession.whatIf = withSet(
			startWhatIf("base", HASH),
			"accounts.fund.lockedUntil",
			"2031-06-30",
		)
		for (const hidden of [false, true]) {
			preferences.hidden = hidden
			const body = render(WhatIfChanges, { props: {} }).body
			expect(body).toContain("30 Jun 2031")
			expect(body).not.toContain("2031-06-30")
			expect(body).not.toContain("amount hidden")
			expect(body).not.toContain("•••••")
		}
	})
})
