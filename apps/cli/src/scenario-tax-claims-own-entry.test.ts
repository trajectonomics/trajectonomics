// A person id that names a built-in object property (`constructor`, `toString`) reads that person's own
// entry in `returns`, never an inherited property (cli ADR-0075).
import { describe, expect, test } from "bun:test"
import { claimsHeldBy } from "./scenario/tax/claims-holder"
import { ownEntry, seedReturns, zeroClaims } from "./scenario/tax/claims-seed"
import type { TaxRequest } from "./scenario/tax/flags"

const flat = { ...zeroClaims(), children: 2 }

describe("a person id that names an object property", () => {
	test("has no entry unless returns holds one of its own", () => {
		expect(ownEntry({}, "constructor")).toBeUndefined()
		expect(ownEntry({}, "toString")).toBeUndefined()
		expect(ownEntry({ constructor: flat }, "constructor")).toEqual(flat)
	})

	test("a swap to a holder named constructor starts them from nothing and keeps the recorded claims", () => {
		const profile = { ...flat, claimsHolder: "me", returns: {} } as unknown as TaxRequest
		const held = claimsHeldBy(profile, "constructor")
		expect(held.children).toBe(0)
		expect(held.claimsHolder).toBe("constructor")
		expect(held.returns?.["me"]?.children).toBe(2)
	})

	test("a partner named toString with no stored entry seeds nothing", () => {
		const pair = { holder: { id: "me" }, partner: { id: "toString" } } as never
		const seeded = seedReturns(pair, { returns: {} } as unknown as TaxRequest, flat)
		expect(seeded.get("toString")?.children).toBe(0)
	})
})
