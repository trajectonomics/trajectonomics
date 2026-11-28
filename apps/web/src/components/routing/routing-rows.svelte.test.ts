import { afterAll, expect, mock, test } from "bun:test"
import { render } from "svelte/server"
import { Reorder as RealReorder } from "../../client/reorder.svelte.js"
import { moved } from "../../lib/view/routing/order"
import { routedSnapshot } from "./routing.test-support"

/**
 * A page keeps the order it is rearranging in the list's own `Reorder`, so a test shows a reordered page by making that
 * class start in the order the page shows: a row moved and not saved yet (#829).
 */
class Shuffled<T> extends RealReorder<T> {
	constructor(initial: readonly T[]) {
		super(initial)
		this.rows = moved(this.rows, 0, 1) as typeof this.rows
	}
}
const Real = RealReorder
mock.module("../../client/reorder.svelte.js", () => ({ Reorder: Shuffled }))
// `mock.restore()` does not undo a module mock (Bun 1.4.4), so the real module is put back by hand for the files after.
afterAll(() => mock.module("../../client/reorder.svelte.js", () => ({ Reorder: Real })))

/** The first row of a rendered page: the row a person reads first after the unsaved reorder. */
function firstRow(html: string): string {
	return html.slice(html.indexOf("<li"), html.indexOf("</li>") + 5)
}

/** The number the first row's Edit button names to a screen reader: the place the row shows on screen. */
function labelNumber(row: string): string | undefined {
	return row.match(/Edit <span class="sr-only">(?:entry|step) (\d+)<\/span>/)?.[1]
}

/** The withdrawal page over "Take from Bank" then "Take from Fund". */
async function withdrawPage(): Promise<string> {
	const { ctx, bank, fund } = routedSnapshot()
	const doc = { ...ctx.doc, cashflow: { ...ctx.doc.cashflow, withdraw: [bank, fund] } }
	const { default: WithdrawSection } = await import("./WithdrawSection.svelte")
	return render(WithdrawSection, { props: { ctx: { ...ctx, doc, shown: doc } } }).body
}

/** The surplus page over "Everything into Bank" then "Everything else into Fund". */
async function surplusPage(): Promise<string> {
	const { ctx, bank, fund } = routedSnapshot()
	const doc = {
		...ctx.doc,
		cashflow: { ...ctx.doc.cashflow, surplus: [{ account: bank }, { account: fund }] },
	}
	const { default: SurplusSection } = await import("./SurplusSection.svelte")
	return render(SurplusSection, { props: { ctx: { ...ctx, doc, shown: doc } } }).body
}

test("the withdrawal row first on screen is labelled entry 1, its place on screen, not entry 2, its saved one", async () => {
	const row = firstRow(await withdrawPage())
	// The row moved down without a save is "Take from Fund", the second entry of the saved list.
	expect(row).toContain("Take from Fund")
	expect(labelNumber(row)).toBe("1")
})

test("the surplus row first on screen is labelled step 1, its place on screen, not step 2, its saved one", async () => {
	const row = firstRow(await surplusPage())
	// The row moved down without a save is "Everything into Fund", the second step of the saved list.
	expect(row).toContain("Everything into Fund")
	expect(labelNumber(row)).toBe("1")
})
