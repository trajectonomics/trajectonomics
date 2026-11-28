import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test"
import { setTestUrl } from "../../../scripts/svelte/app-stub"
import { snapshotLoader } from "../../client/browser"
import { editSession, STALE_PLAN } from "../../client/edit.svelte.js"
import { preferences } from "../../client/preferences.svelte.js"
import { realFetch } from "../../client/what-if.test-support"
import { LOADING } from "../../lib/view/state"
import { body, ITEMS } from "./section.test-support"

const GONE = { code: "not_found", exitCode: 3, message: "No plan is named base." }
const STALE = { code: "scenario_changed", exitCode: 3, message: "The CLI's stale words." }
const SOURCE = "action:keep:base:economy.inflation"

/** The accessible names of the Keep buttons the markup holds. */
const keeps = (html: string): string[] =>
	[...html.matchAll(/<button[^>]*aria-label="(Keep [^"]*)"/g)].map((found) => found[1] ?? "")

/** The list after the server refused the Keep of the inflation line with `error`. */
async function refused(error: object): Promise<string> {
	editSession.token = "token"
	globalThis.fetch = (async () =>
		new Response(JSON.stringify({ ok: false, error }))) as unknown as typeof fetch
	await editSession.run({ kind: "set-main-plan", name: "base" }, SOURCE)
	return body(ITEMS, "base", true)
}

beforeAll(() => setTestUrl("http://127.0.0.1/projection/?scenario=base"))
afterEach(() => {
	globalThis.fetch = realFetch
	editSession.token = null
	editSession.clear()
	editSession.source = "form"
})
afterAll(() => {
	snapshotLoader.replace(LOADING)
	setTestUrl("http://127.0.0.1/")
})

describe("Keep on the Plan page's list", () => {
	test("is not drawn where nothing can be written", () => {
		expect(body(ITEMS)).not.toContain("<button")
	})

	test("is on each value the template wrote and on nothing else, and never says an amount", () => {
		preferences.hidden = false
		const names = keeps(body(ITEMS, "base", true))
		expect(names).toHaveLength(4)
		expect(names[0]).toBe("Keep Inflation: 0% a year")
		expect(names[1]).toEndWith(" 1.5% a year")
		expect(names[2]).toEndWith(" 7% interest")
		expect(names[3]).toEndWith(" amount")
		expect(names.join(" ")).not.toContain("52")
	})

	test("says its refusal once, on the line that sent it", async () => {
		const html = await refused(GONE)
		expect(html.split(GONE.message)).toHaveLength(2)
		const line = html.split("<li").find((one) => one.includes('aria-label="Keep Inflation'))
		expect(line).toContain(GONE.message)
	})

	test("says a plan that moved on with Reload", async () => {
		const html = await refused(STALE)
		expect(html.split(STALE_PLAN)).toHaveLength(2)
		expect(html).toContain(">Reload</button>")
	})
})
