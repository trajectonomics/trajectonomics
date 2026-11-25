import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import DroppedAnchorsNotice from "../components/ui/DroppedAnchorsNotice.svelte"
import { dismissDropped, dropped } from "./dropped-anchors.svelte.js"
import { editSession } from "./edit.svelte.js"
import { RAN, realFetch } from "./what-if.test-support"

const EDIT = { kind: "delete-plan", name: "early" } as const

function answer(extra: Record<string, unknown>): void {
	globalThis.fetch = (async () =>
		new Response(JSON.stringify({ ...RAN, ...extra }))) as unknown as typeof fetch
}

beforeEach(() => {
	editSession.token = "token"
})
afterEach(() => {
	editSession.token = null
	dismissDropped()
	globalThis.fetch = realFetch
})

describe("the household anchors a write dropped", () => {
	test("are kept from the Edit's answer and shown as a notice naming each one", async () => {
		answer({ droppedAnchors: ["flows.fund.end", "flows.school.start"] })
		expect(await editSession.run(EDIT)).toBe(true)
		expect(dropped.anchors).toEqual(["flows.fund.end", "flows.school.start"])
		const body = render(DroppedAnchorsNotice).body
		expect(body).toContain("household anchors that pinned flows.fund.end, flows.school.start")
		expect(body).toContain("Dismiss")
	})

	test("are forgotten by the next Edit, which drops none, and by Dismiss", async () => {
		answer({ droppedAnchors: ["flows.fund.end"] })
		await editSession.run(EDIT)
		answer({})
		await editSession.run(EDIT)
		expect(dropped.anchors).toEqual([])
		expect(render(DroppedAnchorsNotice).body).not.toContain("Dismiss")
		answer({ droppedAnchors: ["flows.fund.end"] })
		await editSession.run(EDIT)
		dismissDropped()
		expect(dropped.anchors).toEqual([])
	})
})
