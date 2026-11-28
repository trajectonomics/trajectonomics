import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { setTestUrl } from "../../../scripts/svelte/app-stub"
import { snapshotLoader } from "../../client/browser"
import { editSession, STALE_PLAN } from "../../client/edit.svelte.js"
import { replaceSnapshot } from "../../client/snapshot.svelte"
import { realFetch } from "../../client/what-if.test-support"
import { mainEdit } from "../../lib/view/plans/edits"
import { ledgerWith } from "../../lib/view/plans/fixtures.test-support"
import { LOADING } from "../../lib/view/state"
import PlansPage from "../pages/PlansPage.svelte"
import WhatIfActions from "../what-if/WhatIfActions.svelte"
import PlanDrawer from "./PlanDrawer.svelte"

const SNAPSHOT = ledgerWith({ base: {}, "retire-early": { main: true }, extra: {} }, [
	"base",
	"retire-early",
	"extra",
])
const GONE = { code: "not_found", exitCode: 3, message: "No plan is named base." }
const STALE = { code: "scenario_changed", exitCode: 3, message: "The CLI's stale words." }

/** "Make this my main plan" on `base`, refused by the server with `error`. */
async function refused(error: object): Promise<void> {
	editSession.token = "token"
	globalThis.fetch = (async () =>
		new Response(JSON.stringify({ ok: false, error }))) as unknown as typeof fetch
	await editSession.run(mainEdit("base"), "action:main:base")
}

beforeEach(() => {
	setTestUrl("http://127.0.0.1/plans/")
	replaceSnapshot(SNAPSHOT)
})
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

const cards = () =>
	render(PlansPage, { props: { range: "all", onRange: () => {}, editable: true } })
		.body.split("<article")
		.slice(1)
const cardOf = (name: string) =>
	cards().find((card) => card.includes(`aria-label="Actions for ${name}"`)) ?? ""
const count = (words: string) => cards().join("").split(words).length - 1

describe("Make this my main plan says its own refusal on the card that sent it", () => {
	test("an error shows once, as an alert beside that plan's menu", async () => {
		await refused(GONE)
		expect(count(GONE.message)).toBe(1)
		expect(cardOf("base")).toMatch(/<p[^>]*role="alert"[^>]*>No plan is named base\./)
	})

	test("a plan that moved on shows one notice with Reload on that card", async () => {
		await refused(STALE)
		expect(count(STALE_PLAN)).toBe(1)
		expect(cardOf("base")).toContain(STALE_PLAN)
		expect(cardOf("base")).toContain(">Reload</button>")
	})

	test("neither the plan drawer nor the what-if bar repeats it", async () => {
		for (const error of [GONE, STALE]) {
			await refused(error)
			for (const other of [render(PlanDrawer).body, render(WhatIfActions).body]) {
				expect(other).not.toContain(STALE_PLAN)
				expect(other).not.toContain(GONE.message)
			}
		}
	})
})
