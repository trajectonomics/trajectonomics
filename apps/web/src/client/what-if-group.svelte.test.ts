import { describe, expect, test } from "bun:test"
import { whatIfSession } from "./what-if.svelte.js"
import { HASH, useSessionHooks } from "./what-if.test-support"

useSessionHooks()

const SPEC = {
	kind: "loan",
	name: "boat-loan",
	paths: ["accounts.boat-loan", "flows.boat-loan-payment", "flows.boat-loan-draw"],
} as const
const PARTS = [
	{ list: "accounts", id: "boat-loan", stored: { rate: 600 }, edited: { rate: 700 } },
	{
		list: "flows",
		id: "boat-loan-payment",
		stored: { start: "2027-07-01" },
		edited: { start: "2027-08-01" },
	},
	{ list: "flows", id: "boat-loan-draw", stored: { amount: "1.00" }, edited: { amount: "2.00" } },
] as const

describe("a loan is one change in the session", () => {
	test("a Try is one change in the panel, and removing it removes every Set", () => {
		expect(whatIfSession.tryGroup("base", HASH, SPEC, PARTS)).toEqual([])
		expect(whatIfSession.whatIf?.sets).toHaveLength(3)
		expect(whatIfSession.changes.map((change) => change.label)).toEqual([
			"Loan boat-loan tried as edited",
		])
		const [change] = whatIfSession.changes
		if (change === undefined) throw new Error("no change")
		whatIfSession.removeChange(change)
		expect(whatIfSession.whatIf).toBeNull()
	})

	test("a Try that changes nothing starts no session", () => {
		const same = PARTS.map((part) => ({ ...part, edited: part.stored }))
		expect(whatIfSession.tryGroup("base", HASH, SPEC, same)).toEqual([])
		expect(whatIfSession.whatIf).toBeNull()
	})

	test("a Try that changes nothing after a Try puts the loan back as stored", () => {
		whatIfSession.tryGroup("base", HASH, SPEC, PARTS)
		whatIfSession.tryGroup(
			"base",
			HASH,
			SPEC,
			PARTS.map((part) => ({ ...part, edited: part.stored })),
		)
		expect(whatIfSession.whatIf).toBeNull()
	})

	test("the switch takes every part off together, and on again puts them all back", () => {
		expect(whatIfSession.setGroupOff("base", HASH, SPEC, SPEC.paths, true)).toBe(true)
		expect(whatIfSession.isGroupOffIn("base", SPEC)).toBe(true)
		expect(whatIfSession.isGroupOffIn("retire-early", SPEC)).toBe(false)
		expect(whatIfSession.whatIf?.removals).toEqual([...SPEC.paths])
		expect(whatIfSession.changes.map((change) => change.label)).toEqual([
			"Loan boat-loan switched off",
		])
		whatIfSession.setGroupOff("base", HASH, SPEC, SPEC.paths, false)
		expect(whatIfSession.whatIf).toBeNull()
	})

	test("a change to another plan asks first, and nothing changes while Apply or Save runs", () => {
		whatIfSession.setGroupOff("base", HASH, SPEC, SPEC.paths, true)
		expect(whatIfSession.setGroupOff("retire-early", HASH, SPEC, SPEC.paths, false)).toBe(false)
		expect(whatIfSession.tryGroup("retire-early", HASH, SPEC, PARTS)).toEqual([])
		expect(whatIfSession.asking).toBe("retire-early")
		expect(whatIfSession.whatIf?.removals).toEqual([...SPEC.paths])
		whatIfSession.saving = true
		expect(whatIfSession.setGroupOff("base", HASH, SPEC, SPEC.paths, false)).toBe(false)
		expect(whatIfSession.tryGroup("base", HASH, SPEC, PARTS)).toEqual([])
		whatIfSession.saving = false
		expect(whatIfSession.whatIf?.removals).toEqual([...SPEC.paths])
	})

	test("the fields a form cleared come back, as a Try of one item says", () => {
		const cleared = whatIfSession.tryGroup("base", HASH, SPEC, [
			{
				list: "flows",
				id: "boat-loan-draw",
				stored: { amount: "1.00", memo: "x" },
				edited: { amount: "2.00" },
			},
		])
		expect(cleared).toEqual(["memo"])
	})
})
