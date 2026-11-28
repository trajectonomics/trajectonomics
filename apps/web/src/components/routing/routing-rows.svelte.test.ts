import { afterAll, expect, mock, test } from "bun:test"
import { render } from "svelte/server"
import { Reorder as RealReorder } from "../../client/reorder.svelte.js"
import type { RoutingContext } from "../../lib/view/routing/context"
import type { Entry, Step } from "../../lib/view/routing/entries"
import { moved } from "../../lib/view/routing/order"
import { routedSnapshot } from "./routing.test-support"

/**
 * A page keeps the order it is rearranging in the list's own `Reorder`, so a test shows a reordered page by making that
 * class start in the order the page shows: a row moved and not saved yet, or the order a save stored while the page
 * still shows the read from before it (#829).
 */
class Shuffled<T> extends RealReorder<T> {
	constructor(initial: readonly T[]) {
		super(initial)
		this.rows = moved(this.rows, 0, 1) as typeof this.rows
	}
}
mock.module("../../client/reorder.svelte.js", () => ({ Reorder: Shuffled }))
afterAll(() => mock.restore())

/** The index the first row's buttons act on, from the place its Edit button names in the saved list. */
function savedPlace(html: string): number {
	const first = html.slice(html.indexOf("<li"), html.indexOf("</li>") + 5)
	const place = first.match(/>Edit <span class="sr-only">(?:entry|step) (\d+)<\/span>/)?.[1]
	if (place === undefined) throw new Error("the first row has an Edit button naming its place")
	return Number(place) - 1
}

/** The Account a drawer shows in its picker, which is the item it was opened on. */
function chosen(html: string): string | undefined {
	return html.match(/<option value="[^"]*" selected="">([^<]*)<\/option>/)?.[1]
}

/** The withdrawal page over "Take from Bank" then "Take from Fund". */
async function withdrawPage(): Promise<{
	ctx: RoutingContext
	html: string
	entries: readonly Entry[]
}> {
	const { ctx, bank, fund } = routedSnapshot()
	const doc = { ...ctx.doc, cashflow: { ...ctx.doc.cashflow, withdraw: [bank, fund] } }
	const pageCtx = { ...ctx, doc, shown: doc }
	const { default: WithdrawSection } = await import("./WithdrawSection.svelte")
	const html = render(WithdrawSection, { props: { ctx: pageCtx } }).body
	return { ctx: pageCtx, html, entries: [bank, fund] }
}

/** The surplus page over "Everything into Bank" then "Everything else into Fund". */
async function surplusPage(): Promise<{
	ctx: RoutingContext
	html: string
	steps: readonly Step[]
}> {
	const { ctx, bank, fund } = routedSnapshot()
	const doc = {
		...ctx.doc,
		cashflow: { ...ctx.doc.cashflow, surplus: [{ account: bank }, { account: fund }] },
	}
	const pageCtx = { ...ctx, doc, shown: doc }
	const { default: SurplusSection } = await import("./SurplusSection.svelte")
	const html = render(SurplusSection, { props: { ctx: pageCtx } }).body
	return { ctx: pageCtx, html, steps: [{ account: bank }, { account: fund }] }
}

test("the withdrawal row first on screen removes, edits and tries its own entry, not the one at its place", async () => {
	const { ctx, html, entries } = await withdrawPage()
	// The row first on screen is "Take from Fund", the second entry of the saved list.
	const at = savedPlace(html)
	expect(entries[at]).toBe(entries[1])
	// Remove sends the saved list without that row's entry, so the other step stays.
	expect(entries.filter((_, one) => one !== at)).toEqual([entries[0]!])
	// Edit opens the drawer on that entry, and Try opens it on the same one.
	const { default: EntryForm } = await import("./EntryForm.svelte")
	const edit = render(EntryForm, { props: { ctx, index: at, tryValue: false, onDone: () => {} } })
	expect(chosen(edit.body)).toBe("Fund")
	const tried = render(EntryForm, { props: { ctx, index: at, tryValue: true, onDone: () => {} } })
	expect(chosen(tried.body)).toBe("Fund")
})

test("the surplus row first on screen removes, edits and tries its own step, not the one at its place", async () => {
	const { ctx, html, steps } = await surplusPage()
	const at = savedPlace(html)
	expect(steps[at]).toEqual(steps[1]!)
	expect(steps.filter((_, one) => one !== at)).toEqual([steps[0]!])
	const { default: StepForm } = await import("./StepForm.svelte")
	const edit = render(StepForm, { props: { ctx, index: at, tryValue: false, onDone: () => {} } })
	expect(chosen(edit.body)).toBe("Fund")
	const tried = render(StepForm, { props: { ctx, index: at, tryValue: true, onDone: () => {} } })
	expect(chosen(tried.body)).toBe("Fund")
})

test("a landed save the page still shows the old order for leaves the first row's buttons on its own entry", async () => {
	// The list holds the order the save stored, and the page still shows the list it read before: the state left by a
	// write that landed unread. The buttons must name their own item, never their place.
	const { ctx, html, entries } = await withdrawPage()
	const at = savedPlace(html)
	expect(entries[at]).toBe(entries[1])
	const { default: EntryForm } = await import("./EntryForm.svelte")
	const edit = render(EntryForm, { props: { ctx, index: at, tryValue: false, onDone: () => {} } })
	expect(chosen(edit.body)).toBe("Fund")
	expect(entries.filter((_, one) => one !== at)).toEqual([entries[0]!])
})
