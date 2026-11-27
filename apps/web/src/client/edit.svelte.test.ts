import { afterEach, describe, expect, test } from "bun:test"
import { accountValues } from "../lib/contract"
import { writtenRereadFailed } from "../lib/edit/failure"
import { editSession } from "./edit.svelte.js"
import { RAN, realFetch } from "./what-if.test-support"

const GOLDEN = new URL("../../../cli/src/account/value/fixtures/values.output", import.meta.url)
const result = accountValues.parse(JSON.parse(await Bun.file(GOLDEN).text()))

/** A write that landed while the Snapshot read after it failed, with the batch it wrote. */
const LANDED = { ok: false, error: writtenRereadFailed(), result }

/** A server whose every answer is the given JSON. */
function answers(value: unknown): void {
	globalThis.fetch = (async () => new Response(JSON.stringify(value))) as unknown as typeof fetch
}

afterEach(() => {
	globalThis.fetch = realFetch
	editSession.token = null
	editSession.busy = false
	editSession.clear()
	editSession.savedUnread = false
})

describe("the page's Edit session", () => {
	test("a write that landed while its read failed is a save, with its result and no form's error", async () => {
		editSession.token = "token"
		answers(LANDED)
		expect(await editSession.run({ kind: "delete-plan", name: "base" })).toBe(true)
		expect(editSession.savedUnread).toBe(true)
		expect(editSession.failure).toBeNull()
		expect(editSession.error).toBeNull()
		expect(editSession.stale).toBe(false)
		expect(editSession.result).toEqual(result)
	})

	test("clear takes the error and the result, and leaves the landed write to the notice", async () => {
		editSession.token = "token"
		answers(LANDED)
		await editSession.run({ kind: "delete-plan", name: "base" })
		editSession.clear()
		expect(editSession.savedUnread).toBe(true)
		expect(editSession.result).toBeNull()
		expect(editSession.failure).toBeNull()
	})

	test("a later refusal keeps the notice and sets the form's error", async () => {
		editSession.token = "token"
		answers(LANDED)
		await editSession.run({ kind: "delete-plan", name: "base" })
		answers({ ok: false, error: { code: "not_found", exitCode: 3, message: "no such plan" } })
		expect(await editSession.run({ kind: "delete-plan", name: "base" })).toBe(false)
		expect(editSession.savedUnread).toBe(true)
		expect(editSession.error).toBe("no such plan")
	})

	test("an Edit whose read succeeded clears the notice", async () => {
		editSession.token = "token"
		answers(LANDED)
		await editSession.run({ kind: "delete-plan", name: "base" })
		answers(RAN)
		expect(await editSession.run({ kind: "delete-plan", name: "base" })).toBe(true)
		expect(editSession.savedUnread).toBe(false)
	})

	test("a reread that succeeds clears the notice", async () => {
		editSession.token = "token"
		answers(LANDED)
		await editSession.run({ kind: "delete-plan", name: "base" })
		answers(RAN)
		expect(await editSession.reread()).toBe(true)
		expect(editSession.savedUnread).toBe(false)
	})

	test("a reread that fails keeps the notice, so Reload can be tried again", async () => {
		editSession.token = "token"
		answers(LANDED)
		await editSession.run({ kind: "delete-plan", name: "base" })
		answers({ ok: false, error: { code: "database_busy", exitCode: 3, message: "busy" } })
		expect(await editSession.reread()).toBe(false)
		expect(editSession.savedUnread).toBe(true)
	})
})
