import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import WhatIfBar from "../components/what-if/WhatIfBar.svelte"
import type { Addition } from "../lib/what-if/additions"
import { whatIfSession } from "./what-if.svelte.js"
import { fakeServer, HASH, held, settle, useSessionHooks } from "./what-if.test-support"

useSessionHooks()

const FLOW = {
	id: "rmf-fund-rmf-2026",
	kind: "contribution",
	frequency: "once",
	amount: "170000.00",
	start: "2026-12-15",
	target: "rmf-fund",
}
const ADD: Addition = { list: "flows", item: FLOW }
const bar = () => render(WhatIfBar, { props: {} }).body

/** The CLI's refusal of one read, naming the added item as it names a changed one (cli ADR 0062). */
const refusal = (message: string) => ({
	argv: [],
	ok: false,
	error: {
		code: "invalid_input",
		exitCode: 2,
		message,
		details: { path: "flows.rmf-fund-rmf-2026" },
	},
})

describe("trying a suggestion as a what-if", () => {
	test("adding items starts a session on the plan, and the read carries them as Additions", async () => {
		fakeServer()
		expect(whatIfSession.addItems("base", HASH, [ADD])).toBe(true)
		await settle()
		expect(whatIfSession.whatIf?.additions).toEqual([ADD])
		expect(held).toHaveLength(1)
		const body = held[0]?.body as unknown as { additions: Addition[] } | undefined
		expect(body?.additions).toEqual([ADD])
	})

	test("the bar lists the Addition with its own Remove this change, and removing it ends the session", () => {
		whatIfSession.addItems("base", HASH, [ADD])
		expect(bar()).toContain("Added flow rmf-fund-rmf-2026")
		expect(bar()).toContain('aria-label="Remove this change"')
		const [change] = whatIfSession.changes
		if (change === undefined) throw new Error("no change")
		whatIfSession.removeChange(change)
		expect(whatIfSession.whatIf).toBeNull()
	})

	test("a refusal of the item shows in plain words beside the item it names", async () => {
		fakeServer()
		whatIfSession.addItems("base", HASH, [ADD])
		await settle()
		const read = refusal("The flow cannot pay into that Account.")
		held[0]?.settle(200, {
			ok: true,
			reads: { projection: read, fi: read, compare: read, chance: null },
		})
		await settle(50)
		expect(bar().match(/The flow cannot pay into that Account\./g)).toHaveLength(1)
	})

	test("items for another plan are refused and ask first, as a switch does", () => {
		whatIfSession.setOff("base", HASH, "flows.gym", true)
		expect(whatIfSession.addItems("retire-early", HASH, [ADD])).toBe(false)
		expect(whatIfSession.asking).toBe("retire-early")
		expect(whatIfSession.whatIf?.additions).toEqual([])
	})

	test("no item means no session", () => {
		expect(whatIfSession.addItems("base", HASH, [])).toBe(false)
		expect(whatIfSession.whatIf).toBeNull()
	})
})
