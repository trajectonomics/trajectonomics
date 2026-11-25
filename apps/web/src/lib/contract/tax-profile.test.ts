import { describe, expect, it } from "bun:test"
import { taxProfile } from "./tax-profile"

/* The stored tax profile (cli ADR-0066, ADR-0075), kept as `traj scenario show` writes it. */

const FLAT = {
	tax: "th-2026",
	filingStatus: "married_separate",
	children: 0,
	childrenAtHigherRate: 0,
	lifeInsurance: 80000,
}

describe("the tax profile contract", () => {
	it("decodes a separate filing's Returns and whose claims the flat keys are, and keeps them", () => {
		const profile = {
			...FLAT,
			claimsHolder: "me",
			returns: { me: { children: 0, childrenAtHigherRate: 0, lifeInsurance: 80000 } },
		}
		expect(taxProfile.parse(profile) as unknown).toEqual(profile)
	})

	it("still decodes a profile that records nobody", () => {
		expect(taxProfile.parse(FLAT) as unknown).toEqual(FLAT)
	})
})
