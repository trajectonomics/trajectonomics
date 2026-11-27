import { afterEach, describe, expect, test } from "bun:test"
import { WRITTEN_REREAD_FAILED } from "../lib/edit/failure"
import { editSession } from "./edit.svelte.js"

const realFetch = globalThis.fetch

/** A server whose every answer is the given JSON. */
function answers(value: unknown): void {
	globalThis.fetch = (async () => new Response(JSON.stringify(value))) as unknown as typeof fetch
}

afterEach(() => {
	globalThis.fetch = realFetch
	editSession.token = null
	editSession.busy = false
	editSession.clear()
})

describe("the page's Edit session", () => {
	test("a write that landed but could not be read again shows the notice, not a form's error", async () => {
		editSession.token = "token"
		answers({
			ok: false,
			error: { code: WRITTEN_REREAD_FAILED, exitCode: 1, message: "saved" },
		})
		expect(await editSession.run({ kind: "delete-plan", name: "base" })).toBe(false)
		expect(editSession.savedUnread).toBe(true)
		expect(editSession.stale).toBe(false)
		expect(editSession.error).toBeNull()
	})

	test("a CLI refusal is still the CLI's sentence, and shows no notice", async () => {
		editSession.token = "token"
		answers({ ok: false, error: { code: "not_found", exitCode: 3, message: "no such plan" } })
		expect(await editSession.run({ kind: "delete-plan", name: "base" })).toBe(false)
		expect(editSession.savedUnread).toBe(false)
		expect(editSession.error).toBe("no such plan")
	})
})
