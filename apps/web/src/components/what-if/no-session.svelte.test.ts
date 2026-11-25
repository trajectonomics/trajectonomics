import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { type Component, createRawSnippet } from "svelte"
import { render } from "svelte/server"
import { setTestUrl } from "../../../scripts/svelte/app-stub"
import { snapshotLoader } from "../../client/browser"
import { replaceSnapshot } from "../../client/snapshot.svelte"
import { useSessionHooks } from "../../client/what-if.test-support"
import type { ProjectionRun } from "../../lib/contract"
import { parseTerms } from "../../lib/view/compare"
import { netWorthPageView } from "../../lib/view/net-worth/page"
import { heroOf } from "../../lib/view/overview/hero"
import { overviewView } from "../../lib/view/overview/view"
import { LOADING } from "../../lib/view/state"
import { DEMO } from "../../lib/view/what-if/fixtures.test-support"
import ComparePanel from "../compare/ComparePanel.svelte"
import MilestonesBody from "../milestones/MilestonesBody.svelte"
import MilestonesView from "../milestones/MilestonesView.svelte"
import NetWorthContent from "../net-worth/NetWorthContent.svelte"
import OverviewGrid from "../overview/OverviewGrid.svelte"
import OverviewHero from "../overview/OverviewHero.svelte"
import ComparePage from "../pages/ComparePage.svelte"
import NetWorthPage from "../pages/NetWorthPage.svelte"
import OverviewPage from "../pages/OverviewPage.svelte"
import RecordValues from "../record-values/RecordValues.svelte"
import PageShell from "../ui/PageShell.svelte"
import ReadView from "../ui/ReadView.svelte"

useSessionHooks()

// The Snapshot store is shared by every test file in the process, so it is put back as it was.
afterAll(() => {
	snapshotLoader.replace(LOADING)
	setTestUrl("http://127.0.0.1/")
})

beforeEach(() => replaceSnapshot(DEMO))

/** A body without Svelte's comment markers and without the whitespace between tags: what a browser shows. */
function shown(body: string): string {
	return body.replace(/<!--.*?-->/gs, "").replace(/>\s+</g, "><")
}

/** Markup as a snippet, so a reference page is built from the pieces the page is built from. */
// biome-ignore lint/suspicious/noExplicitAny: a test renders components whose props differ.
function bodyOf(component: Component<any>, props: Record<string, unknown>): string {
	return render(component, { props }).body
}

const MARK = "<i>content</i>"

/** The page's frame (its heading and intro) with `content` where the page puts its own. */
function framed(title: string, intro: string, content: string): string {
	const mark = createRawSnippet(() => ({ render: () => MARK }))
	return shown(bodyOf(PageShell, { title, intro, children: mark })).replace(MARK, shown(content))
}

/**
 * A page with no What-if session renders its content alone: no spacing wrapper is left behind for a panel that
 * is not there. Each reference is the page's frame around the pieces the page is made of, so it is the page
 * as it was before it had a What-if branch.
 */
describe("with no session, a page is its content and nothing more", () => {
	test("Milestones", () => {
		const read = DEMO.reads.projections["base"]
		if (read === undefined || !read.ok) throw new Error("the Demo lacks base")
		const body = bodyOf(MilestonesBody, {
			run: read.data satisfies ProjectionRun,
			argv: read.argv,
			terms: "both",
			onTerms: () => {},
		})
		const inner = createRawSnippet(() => ({ render: () => body }))
		const reference = bodyOf(ReadView, { read, label: "Milestones of base", children: inner })
		const page = bodyOf(MilestonesView, {
			names: DEMO.params.scenarios,
			projections: DEMO.reads.projections,
			scenario: "base",
			terms: "both",
			onTerms: () => {},
		})
		expect(shown(page)).toBe(shown(reference))
	})

	test("Net worth", () => {
		const content = `<div class="space-y-8">${bodyOf(RecordValues, { snapshot: DEMO })}${bodyOf(NetWorthContent, { view: netWorthPageView(DEMO) })}</div>`
		const page = bodyOf(NetWorthPage, { scenario: "base" })
		expect(shown(page)).toBe(
			framed(
				"Net worth",
				"Net worth at the As-of, its assets and liabilities by account, and its month-end history.",
				content,
			),
		)
	})

	test("Compare", () => {
		const content = bodyOf(ComparePanel, {
			compare: DEMO.reads.compare,
			projections: DEMO.reads.projections,
			terms: parseTerms("nominal"),
			onTerms: () => {},
		})
		const page = bodyOf(ComparePage, { terms: "nominal", onTerms: () => {} })
		expect(shown(page)).toBe(
			framed(
				"Compare",
				"A is drawn solid and B dashed everywhere on this page. Each difference is B minus A, as the CLI states it.",
				content,
			),
		)
	})

	test("Home", () => {
		const hero = heroOf(DEMO, "")
		if (hero === null) throw new Error("the Demo has no hero")
		const content = `<div class="space-y-4">${bodyOf(OverviewHero, { hero })}${bodyOf(OverviewGrid, { view: overviewView(DEMO, "") })}</div>`
		const page = bodyOf(OverviewPage, { scenario: "" })
		expect(shown(page)).toBe(
			framed(
				"Overview",
				"The headline figures of your ledger. Each card names the command that produced it.",
				content,
			),
		)
	})
})
