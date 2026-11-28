import { afterEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { editSession, STALE_PLAN } from "../../client/edit.svelte.js"
import { routing } from "../../client/routing.svelte.js"
import { realFetch } from "../../client/what-if.test-support"
import RoutingBody from "./RoutingBody.svelte"
import { routedSnapshot } from "./routing.test-support"
import StepForm from "./StepForm.svelte"

const { snapshot, ctx } = routedSnapshot()
const BUSY = { code: "database_busy", exitCode: 3, message: "The ledger is busy." }
const STALE = { code: "scenario_changed", exitCode: 3, message: "The CLI's stale words." }

/** One inline action's Edit as the page sends it, refused by the server with `error`. */
async function refused(source: string, error: object): Promise<void> {
	editSession.token = "token"
	globalThis.fetch = (async () =>
		new Response(JSON.stringify({ ok: false, error }))) as unknown as typeof fetch
	await routing.save(ctx, { kind: "list", list: "withdraw", items: [] }, source)
}

afterEach(() => {
	globalThis.fetch = realFetch
	editSession.token = null
	editSession.clear()
	editSession.source = "form"
})

const page = () =>
	render(RoutingBody, { props: { snapshot, scenario: "base", editable: true } }).body
/** One section of the page, without the drawer that follows it. */
const section = (html: string, id: string) =>
	html.split(`<section aria-labelledby="${id}"`)[1]?.split("</section>")[0] ?? ""
/** The rows of a section. */
const rows = (html: string, id: string) => section(html, id).split("<li").slice(1)
const count = (html: string, words: string) => html.split(words).length - 1

describe("an inline routing action says its own refusal beside the control that sent it", () => {
	for (const list of ["surplus", "contribute", "withdraw"]) {
		test(`Done or a drop on ${list}, over a plan that changed, shows one notice with Reload there`, async () => {
			await refused(`action:routing:order:${list}`, STALE)
			const html = page()
			expect(count(html, STALE_PLAN)).toBe(1)
			expect(section(html, list)).toContain(STALE_PLAN)
			expect(section(html, list)).toContain(">Reload</button>")
			expect(html).not.toContain(STALE.message)
		})
	}

	for (const [id, source, at] of [
		["surplus", "action:routing:remove:surplus:1", 1],
		["withdraw", "action:routing:remove:withdraw:2", 2],
		["moves", "action:routing:remove:flows:roll", 0],
	] as const) {
		test(`Remove in ${id} shows an error that names no row in the row it was pressed in`, async () => {
			await refused(source, BUSY)
			const html = page()
			expect(count(html, BUSY.message)).toBe(1)
			expect(rows(html, id)[at]).toContain(BUSY.message)
		})

		test(`Remove in ${id}, over a plan that changed, shows one notice in that row`, async () => {
			await refused(source, STALE)
			const html = page()
			expect(count(html, STALE_PLAN)).toBe(1)
			expect(rows(html, id)[at]).toContain(STALE_PLAN)
		})
	}

	test("an error that names a row the page draws is said on that row, and only there", async () => {
		const path = "document.cashflow.withdraw.0.downTo"
		await refused("action:routing:order:withdraw", { ...BUSY, path })
		const html = page()
		expect(count(html, BUSY.message)).toBe(1)
		expect(rows(html, "withdraw")[0]).toContain(BUSY.message)
	})

	test("an error that names a Flow the page draws nowhere is said beside the control", async () => {
		await refused("action:routing:order:surplus", { ...BUSY, path: "document.flows.none.start" })
		expect(section(page(), "surplus")).toContain(BUSY.message)
	})

	test("a drawer's form repeats none of an inline action's refusal", async () => {
		await refused("action:routing:order:surplus", BUSY)
		const form = render(StepForm, {
			props: { ctx, index: 0, tryValue: false, onDone: () => {} },
		}).body
		expect(form).not.toContain(BUSY.message)
	})
})
