import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { navigations, setTestUrl } from "../../scripts/svelte/app-stub"
import { EDIT_PATH } from "../lib/edit/guard"
import type { PlanRow } from "../lib/view/plans/rows"
import { editSession } from "./edit.svelte.js"
import { deletePlan, renamePlan } from "./plan-actions.svelte.js"
import { whatIfSession } from "./what-if.svelte.js"
import { HASH, RAN, realFetch } from "./what-if.test-support"

const row = (name: string): PlanRow => ({
	name,
	contentHash: HASH,
	main: false,
	hasNotes: false,
	projected: true,
})
const sent: { url: string; body: unknown }[] = []

beforeEach(() => {
	editSession.token = "token"
	sent.length = 0
	navigations.length = 0
	globalThis.fetch = (async (url: string, init: { body: string }) => {
		sent.push({ url, body: JSON.parse(init.body) })
		return new Response(JSON.stringify(RAN))
	}) as unknown as typeof fetch
})
afterEach(() => {
	whatIfSession.end()
	editSession.token = null
	globalThis.fetch = realFetch
	setTestUrl("http://127.0.0.1/")
})

describe("renaming the plan the pages show", () => {
	test("moves the address bar to the new name", async () => {
		setTestUrl("http://127.0.0.1/projection/?scenario=early")
		expect(await renamePlan(row("early"), " later ", true)).toBe(true)
		expect(sent).toEqual([
			{
				url: EDIT_PATH,
				body: { kind: "rename-plan", name: "early", newName: "later", contentHash: HASH },
			},
		])
		expect(navigations.at(-1)).toBe("/projection/?scenario=later")
	})

	test("leaves the address bar alone when the pages show another plan, and when the Edit is refused", async () => {
		setTestUrl("http://127.0.0.1/projection/?scenario=base")
		await renamePlan(row("early"), "later", false)
		expect(navigations).toEqual([])
		globalThis.fetch = (async () =>
			new Response(
				JSON.stringify({ ok: false, error: { code: "x", exitCode: 5, message: "no" } }),
			)) as unknown as typeof fetch
		expect(await renamePlan(row("early"), "later", true)).toBe(false)
		expect(navigations).toEqual([])
	})

	test("takes a What-if session on the plan along to the new name, with its changes", async () => {
		whatIfSession.setOff("early", HASH, "flows.rent", true)
		await renamePlan(row("early"), "later", true)
		expect(whatIfSession.whatIf?.plan).toBe("later")
		expect(whatIfSession.whatIf?.removals).toEqual(["flows.rent"])
		expect(whatIfSession.requestSwitch("later")).toBe(true)
	})

	test("leaves a What-if session on another plan as it was", async () => {
		whatIfSession.setOff("base", HASH, "flows.rent", true)
		await renamePlan(row("early"), "later", false)
		expect(whatIfSession.whatIf?.plan).toBe("base")
	})
})

describe("deleting the plan the pages show", () => {
	test("shows the first plan left", async () => {
		setTestUrl("http://127.0.0.1/projection/?scenario=early")
		expect(await deletePlan("early", ["base", "early"], true)).toBe(true)
		expect(sent[0]?.body).toEqual({ kind: "delete-plan", name: "early" })
		expect(navigations.at(-1)).toBe("/projection/?scenario=base")
	})

	test("does not move the address bar when the pages show another plan", async () => {
		await deletePlan("early", ["base", "early"], false)
		expect(navigations).toEqual([])
	})
})
