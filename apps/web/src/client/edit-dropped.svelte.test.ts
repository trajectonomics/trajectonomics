import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import DroppedAnchorsNotice from "../components/ui/DroppedAnchorsNotice.svelte"
import { writtenRereadFailed } from "../lib/edit/failure"
import { dismissDropped, dropped } from "./dropped-anchors.svelte.js"
import { editSession } from "./edit.svelte.js"
import { selectPlan } from "./select-plan.svelte.js"
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
	editSession.savedUnread = false
	dismissDropped()
	globalThis.fetch = realFetch
})

describe("the household anchors a write dropped", () => {
	test("are kept from the Edit's answer and shown as a notice naming each one", async () => {
		answer({ droppedAnchors: ["flows.fund.end", "flows.school.start"] })
		expect(await editSession.run(EDIT)).toBe(true)
		expect(dropped.anchors).toEqual(["flows.fund.end", "flows.school.start"])
		const body = render(DroppedAnchorsNotice).body
		expect(body).toContain(
			"This change to plan early removed the household anchors that pinned flows.fund.end, flows.school.start",
		)
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

	test("belong to the plan the write changed, so switching plans hides the notice", async () => {
		answer({ droppedAnchors: ["flows.fund.end"] })
		await editSession.run(EDIT)
		expect(dropped.plan).toBe("early")
		expect(selectPlan("late")).toBe(true)
		expect(dropped.anchors).toEqual([])
		expect(render(DroppedAnchorsNotice).body).not.toContain("Dismiss")
	})

	test("stay when the page then shows the plan the write changed, as after Save as new plan", async () => {
		answer({ droppedAnchors: ["flows.fund.end"] })
		await editSession.run({ kind: "copy-plan", from: "base", name: "early" })
		expect(selectPlan("early")).toBe(true)
		expect(dropped.anchors).toEqual(["flows.fund.end"])
		expect(render(DroppedAnchorsNotice).body).toContain("This change to plan early removed")
	})

	test("fall back to the plain wording when the Edit names no plan", () => {
		dropped.anchors = ["flows.fund.end"]
		expect(render(DroppedAnchorsNotice).body).toContain(
			"This change removed the household anchor that pinned",
		)
	})
})

describe("the household Owners a write dropped", () => {
	test("are kept from the Edit's answer and shown as a notice naming the plan and the item", async () => {
		answer({ droppedOwners: ["flows.rent"] })
		expect(await editSession.run(EDIT)).toBe(true)
		expect(dropped.owners).toEqual(["flows.rent"])
		expect(render(DroppedAnchorsNotice).body).toContain(
			"This change to plan early removed the Owner of flows.rent, because the plan no longer holds that item.",
		)
	})

	test("are cleared by Dismiss, and when another plan is shown", async () => {
		answer({ droppedOwners: ["flows.rent"] })
		await editSession.run(EDIT)
		dismissDropped()
		expect(dropped.owners).toEqual([])
		expect(render(DroppedAnchorsNotice).body).not.toContain("Dismiss")

		answer({ droppedOwners: ["flows.rent"] })
		await editSession.run(EDIT)
		expect(selectPlan("late")).toBe(true)
		expect(dropped.owners).toEqual([])
		expect(render(DroppedAnchorsNotice).body).not.toContain("Dismiss")
	})

	test("stay when the page then shows the plan the write changed", async () => {
		answer({ droppedOwners: ["flows.rent"] })
		await editSession.run({ kind: "copy-plan", from: "base", name: "early" })
		expect(selectPlan("early")).toBe(true)
		expect(dropped.owners).toEqual(["flows.rent"])
		expect(render(DroppedAnchorsNotice).body).toContain(
			"This change to plan early removed the Owner",
		)
	})
})

describe("a new plan that replaced one made while the Edit ran", () => {
	test("is said in the notice, and the next Edit that replaced none hides it", async () => {
		answer({ replaced: true })
		const edit = { kind: "apply-plan", name: "fresh", template: { asOf: "2026-10-31" } } as const
		expect(await editSession.run(edit)).toBe(true)
		expect(dropped.replaced).toBe(true)
		const body = render(DroppedAnchorsNotice).body
		expect(body).toContain(
			"A plan named fresh was made while this change ran, and this change replaced it.",
		)
		expect(body).toContain("Dismiss")
		answer({})
		await editSession.run(EDIT)
		expect(dropped.replaced).toBe(false)
		expect(render(DroppedAnchorsNotice).body).not.toContain("Dismiss")
	})

	test("is said even when the read after the write failed", async () => {
		globalThis.fetch = (async () =>
			new Response(
				JSON.stringify({ ok: false, error: writtenRereadFailed(), replaced: true }),
			)) as unknown as typeof fetch
		const edit = { kind: "apply-plan", name: "fresh", template: { asOf: "2026-10-31" } } as const
		expect(await editSession.run(edit)).toBe(true)
		expect(editSession.savedUnread).toBe(true)
		expect(dropped.replaced).toBe(true)
		expect(render(DroppedAnchorsNotice).body).toContain(
			"A plan named fresh was made while this change ran, and this change replaced it.",
		)
	})
})

describe("a write that drops both household anchors and Owners", () => {
	test("names every item in one notice, and Dismiss clears both lists", async () => {
		answer({
			droppedAnchors: ["flows.fund.end", "flows.school.start"],
			droppedOwners: ["flows.rent", "flows.food", "flows.fund"],
		})
		expect(await editSession.run(EDIT)).toBe(true)
		expect(dropped.anchors).toEqual(["flows.fund.end", "flows.school.start"])
		expect(dropped.owners).toEqual(["flows.rent", "flows.food", "flows.fund"])
		const body = render(DroppedAnchorsNotice).body
		expect(body).toContain(
			"This change to plan early removed the household anchors that pinned flows.fund.end, flows.school.start, because the plan no longer holds those dates.",
		)
		expect(body).toContain(
			"This change to plan early removed the Owner of flows.rent, the Owner of flows.food and the Owner of flows.fund, because the plan no longer holds those items.",
		)
		dismissDropped()
		expect(dropped.anchors).toEqual([])
		expect(dropped.owners).toEqual([])
		expect(render(DroppedAnchorsNotice).body).not.toContain("Dismiss")
	})
})
