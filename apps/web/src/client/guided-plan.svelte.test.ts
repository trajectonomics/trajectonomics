import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { demoSnapshotJson } from "../../scripts/demo-snapshot"
import { navigations, setTestUrl } from "../../scripts/svelte/app-stub"
import { type Snapshot, snapshot } from "../lib/contract"
import { EDIT_PATH, REREAD_PATH } from "../lib/edit/guard"
import type { RowDrafts } from "../lib/view/guided/money-draft"
import { keepProblem } from "../lib/view/guided/money-draft"
import type { PersonDraft } from "../lib/view/household/person-draft"
import { editSession } from "./edit.svelte.js"
import { guidedSession } from "./guided-plan.svelte.js"
import { whatIfSession } from "./what-if.svelte.js"
import { HASH, realFetch } from "./what-if.test-support"

const DEMO: Snapshot = snapshot.parse(await demoSnapshotJson())
const HOLDER: PersonDraft = {
	name: "me",
	displayLabel: "Me",
	role: "holder",
	relation: "",
	born: "1990-06",
	lifeExpectancy: "90",
	joins: "",
}

/** Two rows of a read, with a kept answer where a test names one. */
function rowsOf(...ids: string[]): RowDrafts {
	return Object.fromEntries(ids.map((id) => [id, { keep: true, amount: "", earned: true }]))
}

/** Every request a test's fake server was sent. */
const sent: { url: string; body: unknown }[] = []

/** A server whose every answer is the given JSON. */
function answers(value: unknown): void {
	globalThis.fetch = (async (url: string, init?: { body?: string }) => {
		sent.push({ url, body: init?.body === undefined ? null : JSON.parse(init.body) })
		return new Response(JSON.stringify(value))
	}) as unknown as typeof fetch
}

/** The answers that make a guided plan save: a valid household, name and stop age. */
function answerEveryStep(): void {
	guidedSession.people = [HOLDER]
	guidedSession.name = "guided"
	guidedSession.age = "60"
}

beforeEach(() => {
	setTestUrl("http://127.0.0.1/plans/new/")
	editSession.token = "token"
	editSession.clear()
	navigations.length = 0
	sent.length = 0
	guidedSession.cancel()
})
afterEach(() => {
	guidedSession.cancel()
	whatIfSession.end()
	editSession.token = null
	editSession.busy = false
	editSession.clear()
	editSession.savedUnread = false
	globalThis.fetch = realFetch
})

describe("a Reload with a newer read", () => {
	test("keeps an answer for a row the read still carries, drops one it lost, and changes a row it gained", () => {
		const first = rowsOf("salary", "bonus")
		const next = rowsOf("salary", "rent")
		guidedSession.changeRow(first, "salary", { keep: false })

		const kept = guidedSession.rowsFor(next)
		expect(kept["salary"]?.keep).toBe(false)
		expect(kept["bonus"]).toBeUndefined()
		expect(kept["rent"]).toEqual(next["rent"])
		expect(keepProblem(kept)).toBeNull()

		// The row the first read did not carry is the one the person ticks off after Reload.
		guidedSession.changeRow(next, "rent", { keep: false })
		expect(guidedSession.rowsFor(next)["rent"]?.keep).toBe(false)
	})

	test("goes back to the money step, and a failed read keeps the page with its error", async () => {
		guidedSession.step = "stop"
		guidedSession.refusal = "The ledger changed."
		answers({ ok: true, snapshot: DEMO })
		await guidedSession.reload()
		expect(String(guidedSession.step)).toBe("money")
		expect(guidedSession.refusal).toBeNull()

		guidedSession.step = "stop"
		answers({ ok: false, error: { code: "database_busy", exitCode: 3, message: "busy" } })
		await guidedSession.reload()
		expect(guidedSession.step).toBe("stop")
		expect(editSession.error).toBe("busy")
	})
})

describe("saving", () => {
	test("navigates to the plan it made", async () => {
		answerEveryStep()
		answers({ ok: true, snapshot: DEMO })
		await guidedSession.save(DEMO)
		expect(navigations.at(-1)).toContain("scenario=guided")
	})

	test("keeps the page when a What-if on another plan refuses the switch", async () => {
		answerEveryStep()
		guidedSession.step = "stop"
		expect(whatIfSession.setOff("base", HASH, "flows.rent", true)).toBe(true)
		expect(whatIfSession.active).toBe(true)
		answers({ ok: true, snapshot: DEMO })
		await guidedSession.save(DEMO)
		expect(navigations).toEqual([])
		expect(guidedSession.step).toBe("stop")
	})

	test("shows the CLI's refusal with its hint, and offers Reload", async () => {
		answerEveryStep()
		answers({
			ok: false,
			error: {
				code: "guided_ledger_changed",
				exitCode: 2,
				message: "The ledger changed.",
				hint: "Run traj baseline rates to see it.",
			},
		})
		await guidedSession.save(DEMO)
		expect(guidedSession.refusal).toBe("The ledger changed.")
		expect(guidedSession.hint).toBe("Run traj baseline rates to see it.")
		expect(guidedSession.reloadable).toBe(true)
	})

	test("reads the plans again when the plan was saved without its household", async () => {
		answerEveryStep()
		globalThis.fetch = (async (url: string, init?: { body?: string }) => {
			sent.push({ url, body: init?.body === undefined ? null : JSON.parse(init.body) })
			if (url === REREAD_PATH) return new Response(JSON.stringify({ ok: true, snapshot: DEMO }))
			return new Response(
				JSON.stringify({
					ok: false,
					error: {
						code: "guided_plan_half_saved",
						exitCode: 1,
						message: "The plan guided was saved without its household.",
					},
				}),
			)
		}) as unknown as typeof fetch
		await guidedSession.save(DEMO)
		expect(sent.map((one) => one.url)).toEqual([EDIT_PATH, REREAD_PATH])
		expect(sent[1]?.body).toEqual({ addPlan: "guided" })
		expect(guidedSession.refusal).toContain("without its household")
	})
})
