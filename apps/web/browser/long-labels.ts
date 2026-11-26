import { expect, type Page } from "@playwright/test"
import { measureOverflow } from "./fit"

// The name a plan may state: 80 code points (sim ADR 0032), which may be one word, so every surface must wrap it.
export const LONG = "m".repeat(80)
export const MILESTONE = "car-paid-off"
export const VIEWPORT = { width: 360, height: 800 }

interface Milestone {
	id: string
	displayLabel?: string
}

interface Account {
	id: string
	kind: string
	rate: number
	payout?: Record<string, unknown>
	[key: string]: unknown
}

interface Flow {
	id: string
	kind: string
	frequency: string
	start: string
	[key: string]: unknown
}

interface Document {
	flows: Flow[]
	accounts: Account[]
	milestones?: Milestone[]
	[key: string]: unknown
}

export interface DemoSnapshot {
	reads: {
		documents: Record<string, { ok: boolean; data?: { scenario: { document: Document } } }>
		projections: Record<string, unknown>
		fi: Record<string, unknown>
		compare: unknown
		chance: Record<string, unknown>
	}
}

/** The Demo snapshot with one 80-character Milestone name on every surface these checks read. */
export async function longNamed(page: Page): Promise<DemoSnapshot> {
	const response = await page.request.get("/demo/snapshot.json")
	const snapshot = (await response.json()) as DemoSnapshot
	const read = snapshot.reads.documents["base"]
	if (read?.ok !== true || read.data === undefined) throw new Error("the Demo reads no base plan")
	const document = read.data.scenario.document
	const milestone = document.milestones?.find((one) => one.id === MILESTONE)
	if (milestone === undefined) throw new Error("the Demo has no car Milestone")
	milestone.displayLabel = LONG
	const [bank, fund] = document.accounts
	if (bank === undefined || fund === undefined) throw new Error("the Demo has two accounts")
	const rent = document.flows.find((flow) => flow.id === "rent")
	if (rent === undefined) throw new Error("the Demo spends on rent")
	// Expenses: the Flow's card reads when the Milestone fires.
	rent["startAt"] = MILESTONE
	// Routing: a move that lands when the Milestone fires.
	document.flows.push({
		id: "move-once",
		kind: "transfer",
		source: bank.id,
		target: fund.id,
		frequency: "once",
		start: "2026-11-01",
		amount: "1000.00",
		startAt: MILESTONE,
	})
	// Assets: a payout that starts when the Milestone fires.
	fund.payout = { bps: "400", frequency: "annual", rounding: "halfUp", startAt: MILESTONE }
	return snapshot
}

/** The Demo snapshot with the Flow that has a spending rule named by an 80-character label. */
export async function longFlow(page: Page): Promise<DemoSnapshot> {
	const response = await page.request.get("/demo/snapshot.json")
	const snapshot = (await response.json()) as DemoSnapshot
	const read = snapshot.reads.documents["base"]
	if (read?.ok !== true || read.data === undefined) throw new Error("the Demo reads no base plan")
	const flow = read.data.scenario.document.flows.find((one) => one.id === "retirement-spending")
	if (flow === undefined) throw new Error("the Demo has a spending rule")
	flow["displayLabel"] = LONG
	return snapshot
}

/** Serves the patched Snapshot on both the Demo's path and the person's own. */
export async function serve(page: Page, snapshot: DemoSnapshot): Promise<void> {
	await page.route(/\/snapshot\.json$/, (route) => route.fulfill({ json: snapshot }))
}

/** The page never scrolls sideways with the long name on it. */
export async function expectNoSidewaysScroll(page: Page): Promise<void> {
	await expect(page.getByText(LONG).filter({ visible: true }).first()).toBeVisible()
	const fit = await measureOverflow(page, true)
	expect(fit.tables, "tables outside a scroll box").toEqual([])
	expect(fit.scrollWidth, "the page's scroll width").toBeLessThanOrEqual(fit.innerWidth)
}
