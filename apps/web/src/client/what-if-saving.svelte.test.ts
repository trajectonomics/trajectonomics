import { describe, expect, test } from "bun:test"
import { writtenRereadFailed } from "../lib/edit/failure"
import { EDIT_PATH } from "../lib/edit/guard"
import { editSession } from "./edit.svelte.js"
import { whatIfSession } from "./what-if.svelte.js"
import {
	fakeServer,
	HASH,
	type Held,
	held,
	RAN,
	REFUSED,
	settle,
	useSessionHooks,
} from "./what-if.test-support"

useSessionHooks()

/** A write that landed while the Snapshot read after it failed. */
const LANDED = { ok: false, error: writtenRereadFailed() }

/** Reads a session of one switch to the end, so Apply and Save are allowed, and returns the Edit's request. */
async function readyToSend(
	send: () => Promise<boolean>,
): Promise<{ held: Held; done: Promise<boolean> }> {
	fakeServer()
	whatIfSession.setOff("base", HASH, "flows.rent", true)
	await settle()
	held[0]?.settle()
	await settle(50)
	const done = send()
	await settle(20)
	const edit = held.find((call) => call.url === EDIT_PATH)
	if (edit === undefined) throw new Error("no Edit was sent")
	return { held: edit, done }
}

describe("a change made while Apply or Save runs", () => {
	const sends: [string, () => Promise<boolean>][] = [
		["Apply", () => whatIfSession.applyToPlan()],
		["Save", () => whatIfSession.keepAsPlan("kept")],
	]
	for (const [action, send] of sends) {
		test(`${action}: every change is refused while it runs, so the bar never lists a change that is not written`, async () => {
			const { held: edit, done } = await readyToSend(send)
			expect(whatIfSession.saving).toBe(true)
			expect(whatIfSession.setOff("base", HASH, "flows.living", true)).toBe(false)
			expect(
				whatIfSession.tryFlow("base", HASH, {
					stored: { id: "gym", amount: "1" },
					edited: { id: "gym", amount: "2" },
				}),
			).toBe(false)
			// The refused Try a value adds no Set: the session still holds only the change sent.
			expect(whatIfSession.whatIf?.sets ?? []).toEqual([])
			expect(whatIfSession.changes).toHaveLength(1)
			const [rent] = whatIfSession.changes
			if (rent === undefined) throw new Error("no change")
			whatIfSession.removeChange(rent)
			whatIfSession.revert()
			expect(whatIfSession.revertAndSwitch()).toBeNull()
			expect(whatIfSession.whatIf?.removals).toEqual(["flows.rent"])
			expect(edit.body).toMatchObject({ removals: ["flows.rent"] })
			// No read was asked for the refused changes, and the server stays free for the Edit.
			expect(held.filter((call) => call.url !== EDIT_PATH)).toHaveLength(1)
			edit.settle(200, RAN)
			expect(await done).toBe(true)
			expect(whatIfSession.whatIf).toBeNull()
			expect(whatIfSession.saving).toBe(false)
		})

		test(`${action}: an Edit that did not run keeps the session and takes changes again`, async () => {
			const { held: edit, done } = await readyToSend(send)
			whatIfSession.setOff("base", HASH, "flows.living", true)
			edit.settle(200, REFUSED)
			expect(await done).toBe(false)
			expect(whatIfSession.saving).toBe(false)
			expect(whatIfSession.whatIf?.removals).toEqual(["flows.rent"])
			expect(whatIfSession.setOff("base", HASH, "flows.living", true)).toBe(true)
			expect(whatIfSession.whatIf?.removals).toEqual(["flows.rent", "flows.living"])
		})

		test(`${action}: a write that landed while its read failed still ends the session and says so above the page`, async () => {
			const { held: edit, done } = await readyToSend(send)
			edit.settle(200, LANDED)
			expect(await done).toBe(true)
			expect(whatIfSession.whatIf).toBeNull()
			expect(editSession.savedUnread).toBe(true)
		})
	}

	test("a second Apply while one runs sends nothing", async () => {
		const { held: edit, done } = await readyToSend(() => whatIfSession.applyToPlan())
		expect(await whatIfSession.applyToPlan()).toBe(false)
		expect(held.filter((call) => call.url === EDIT_PATH)).toHaveLength(1)
		edit.settle(200, RAN)
		await done
	})
})
