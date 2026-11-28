import { afterEach, describe, expect, test } from "bun:test"
import { editSession } from "./edit.svelte.js"
import { RAN, realFetch } from "./what-if.test-support"

const SOURCE = "action:main:base"
const STALE = { ok: false, error: { code: "scenario_changed", exitCode: 3, message: "changed" } }
const BUSY = { ok: false, error: { code: "database_busy", exitCode: 3, message: "busy" } }

/** A server whose every answer is the given JSON. */
function answers(value: unknown): void {
	globalThis.fetch = (async () => new Response(JSON.stringify(value))) as unknown as typeof fetch
}

/** An inline action refused over a plan that moved on. */
async function staleAction(): Promise<void> {
	editSession.token = "token"
	answers(STALE)
	await editSession.run({ kind: "set-main-plan", name: "base" }, SOURCE)
}

afterEach(() => {
	globalThis.fetch = realFetch
	editSession.token = null
	editSession.clear()
	editSession.source = "form"
})

describe("Reload beside an inline action", () => {
	test("that fails keeps the action's source, so the control says why and Reload stays", async () => {
		await staleAction()
		answers(BUSY)
		expect(await editSession.reread()).toBe(false)
		expect(editSession.source).toBe(SOURCE)
		expect(editSession.stale).toBe(true)
		expect(editSession.error).toBe("busy")
	})

	test("from the notice says why in the notice, and leaves the source and the error alone", async () => {
		await staleAction()
		answers(BUSY)
		expect(await editSession.reload("copy")).toBe(false)
		expect(editSession.source).toBe(SOURCE)
		expect(editSession.stale).toBe(true)
		expect(editSession.error).toBeNull()
		expect(editSession.reloadError).toBe("busy")
		expect(editSession.reloadFrom).toBe("copy")
	})

	test("that succeeds forgets the refusal", async () => {
		await staleAction()
		answers(RAN)
		expect(await editSession.reread()).toBe(true)
		expect(editSession.stale).toBe(false)
	})

	test("leaves a reread that carries inputs to the form that sent it", async () => {
		await staleAction()
		answers(BUSY)
		await editSession.reread(null)
		expect(editSession.source).toBe("form")
	})
})
