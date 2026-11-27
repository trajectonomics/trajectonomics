import { afterEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { editSession } from "../../client/edit.svelte.js"
import { routing } from "../../client/routing.svelte.js"
import { whatIfSession } from "../../client/what-if.svelte.js"
import { WRITTEN_REREAD_FAILED, WRITTEN_REREAD_FAILED_MESSAGE } from "../../lib/edit/failure"
import { sessionWith } from "../../lib/view/routing/change"
import { moved } from "../../lib/view/routing/order"
import { shownPlan } from "../../lib/what-if/routing"
import { startWhatIf } from "../../lib/what-if/session"
import RoutingBody from "./RoutingBody.svelte"
import RoutingDrawer from "./RoutingDrawer.svelte"
import { routedSnapshot } from "./routing.test-support"
import StepForm from "./StepForm.svelte"

const { snapshot, ctx, bank } = routedSnapshot()
const text = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ")
const stored = ctx.doc.cashflow?.withdraw ?? []
const floor = { account: bank, downTo: "55555.00" }
const triedWithdraw = [floor, ...stored.slice(1)]

/** A session that tries a floor on `withdraw`, as the drawer's "Try this value" leaves it. */
function tryFloor() {
	const session = sessionWith(startWhatIf("base", ctx.contentHash), ctx.doc, {
		kind: "list",
		list: "withdraw",
		items: triedWithdraw,
	})
	whatIfSession.whatIf = session
	return session
}

afterEach(() => {
	whatIfSession.end()
	whatIfSession.answer = null
	editSession.clear()
	editSession.source = "form"
})

const page = () =>
	render(RoutingBody, { props: { snapshot, scenario: "base", editable: true } }).body

describe("a list the what-if changes is shown and tried from the session", () => {
	test("the rows show the tried floor, and Edit and Remove wait while Try still works", () => {
		tryFloor()
		const html = page()
		expect(text(html)).toContain("down to 55,555.00 THB")
		expect(text(html)).toContain("Apply or revert the what-if first to save a change to this list.")
		const edits = html.match(/<button[^>]*>\s*Edit\s*<span class="sr-only">entry/g) ?? []
		expect(edits.length).toBeGreaterThan(0)
		for (const one of edits) expect(one).toMatch(/\sdisabled(=|\s|>)/)
	})

	test("Try this order after a floor try keeps the floor: the order is built from the session's list", () => {
		const session = tryFloor()
		const shown = shownPlan(ctx.doc, session).cashflow?.withdraw ?? []
		expect(shown[0]).toEqual(floor)
		const next = sessionWith(session, ctx.doc, {
			kind: "list",
			list: "withdraw",
			items: moved(shown, 0, 1),
		})
		const set = next.sets.find((one) => one.path === "cashflow.withdraw")
		expect(set?.value).toEqual(JSON.parse(JSON.stringify([shown[1], floor, ...shown.slice(2)])))
		expect(next.sets).toHaveLength(1)
	})

	test("a step's drawer that tries opens the step the session shows, not the stored one at that position", () => {
		const session = sessionWith(startWhatIf("base", ctx.contentHash), ctx.doc, {
			kind: "list",
			list: "surplus",
			items: moved(ctx.doc.cashflow?.surplus ?? [], 0, 1),
		})
		const shown = shownPlan(ctx.doc, session)
		const html = render(StepForm, {
			props: { ctx: { ...ctx, shown }, index: 0, tryValue: true, onDone: () => {} },
		}).body
		// The session's first step is the share step; the stored first step is the capped one.
		expect(html).toContain('value="30.00"')
		expect(html).not.toContain('value="300000.00"')
	})
})

describe("each drawer names itself by its own heading", () => {
	test("three dialogs have three distinct labels, each pointing at its own title", () => {
		const html = page()
		const labels = [...html.matchAll(/<dialog[^>]*aria-labelledby="([^"]+)"/g)].map(
			(match) => match[1],
		)
		expect(labels).toHaveLength(3)
		expect(new Set(labels).size).toBe(3)
		for (const label of labels) expect(html.match(new RegExp(`id="${label}"`, "g"))).toHaveLength(1)
	})

	test("a drawer renders its title under its label", () => {
		const children = () => ({ render: () => "<p>x</p>" })
		expect(typeof RoutingDrawer).toBe("function")
		expect(children().render()).toBe("<p>x</p>")
	})
})

describe("a refusal's source", () => {
	test("says whether its message is the CLI's own or the server's, so only the CLI's is marked", () => {
		editSession.source = "routing"
		editSession.failure = {
			code: "edit_running",
			exitCode: 1,
			message: "Another Edit is running. Wait for it.",
		}
		editSession.error = "Another Edit is running. Wait for it."
		expect(routing.message).toBe("Another Edit is running. Wait for it.")
		expect(routing.messageFromCli).toBe(false)
		editSession.failure = {
			code: "invalid_input",
			exitCode: 2,
			message: "WITHDRAW_FLOOR_ORDER: a floor after a plain entry",
		}
		expect(routing.messageFromCli).toBe(true)
	})

	test("leaves a write that landed and could not be read again to the stale notice, not the form", () => {
		editSession.source = "routing"
		editSession.failure = {
			code: WRITTEN_REREAD_FAILED,
			exitCode: 1,
			message: WRITTEN_REREAD_FAILED_MESSAGE,
		}
		expect(editSession.savedUnread).toBe(true)
		expect(routing.message).toBeNull()
		expect(routing.messageFromCli).toBe(false)
	})
})

describe("a what-if's refusal lands on its row", () => {
	const error = {
		code: "invalid_input",
		exitCode: 2,
		message: "WITHDRAW_FLOOR_ORDER: a floor after a plain entry",
		path: "--set",
		details: { path: "cashflow.withdraw", documentPath: "document.cashflow.withdraw.1.downTo" },
	}

	test("a tried floor order the engine refuses is placed from details.documentPath", () => {
		whatIfSession.whatIf = sessionWith(startWhatIf("base", "h"), ctx.doc, {
			kind: "list",
			list: "withdraw",
			items: triedWithdraw,
		})
		whatIfSession.answer = {
			ok: true,
			reads: {
				projection: { argv: [], ok: false, error },
				fi: { argv: [], ok: true, data: {} },
				compare: { argv: [], ok: true, data: {} },
				chance: null,
			},
		}
		expect(routing.place).toEqual({ kind: "row", list: "withdraw", index: 1, field: "downTo" })
		expect(routing.message).toBe(error.message)
	})

	test("a refusal while the session tries no routing list lands nowhere", () => {
		whatIfSession.whatIf = {
			...startWhatIf("base", "h"),
			sets: [{ path: "economy.inflation", value: 500 }],
		}
		whatIfSession.answer = {
			ok: true,
			reads: {
				projection: { argv: [], ok: false, error },
				fi: { argv: [], ok: true, data: {} },
				compare: { argv: [], ok: true, data: {} },
				chance: null,
			},
		}
		expect(routing.place).toBeNull()
		expect(routing.message).toBeNull()
	})
})
