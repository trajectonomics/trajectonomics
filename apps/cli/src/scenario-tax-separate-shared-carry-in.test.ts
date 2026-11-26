import { describe, expect, it } from "bun:test"
import { carryInFile } from "./projection/carry-in-support"
import { errorOf, projection } from "./projection/testing"
import { runBody } from "./projection-run-support"
import {
	dues2026,
	fullRecord,
	RUN,
	record,
	salaries,
	separate,
} from "./scenario-tax-separate-shared-support"

/*
 * A Projection that starts inside 2026. Each shared-loan Levy reads the other Filer's income from
 * that Filer's own Carry-in record, so a caller's ordinary file (one record per Levy, each stating
 * only that Filer's income) keeps the one-earner rule right (cli ADR-0075, trajectonomics#619).
 */

describe("a 2026 start inside the tax year", () => {
	// Both earn in 2026: the holder claims its 30,000 share, so allowances 90,000, taxable 810,000,
	//   tax 77,000; the partner's taxable 310,000, tax 8,500. The holder's record leaves the
	//   partner's salary to "rest", and the CLI reads it from the partner's own record.
	it("reads each Filer's income from their own record: 77,000 and 8,500", async () => {
		const home = await separate(salaries("2026-12-31", "2026-12-31"))
		const res = await projection(home, [
			...RUN,
			"--carry-in",
			carryInFile(home, [
				record("th-2026-pit@me", "1000000.00"),
				record("th-2026-pit@partner", "500000.00"),
			]),
		])
		expect(res.code, res.err).toBe(0)
		expect(dues2026(runBody(res))).toEqual({ me: "77000.00", partner: "8500.00" })
	})

	// The partner's salary ended in 2025, so in 2026 only the holder earns and claims all 60,000:
	//   allowances 120,000, taxable 780,000, tax 71,000; the partner has no income and owes 0.
	it("gives the whole loan to the only 2026 earner: 71,000 and 0", async () => {
		const home = await separate(salaries("2026-12-31", "2025-12-31", "2025-01-01"))
		const res = await projection(home, [
			...RUN,
			"--carry-in",
			carryInFile(home, [
				record("th-2026-pit@me", "1000000.00"),
				record("th-2026-pit@partner", "0.00"),
			]),
		])
		expect(res.code, res.err).toBe(0)
		expect(dues2026(runBody(res))).toEqual({ me: "71000.00", partner: "0.00" })
	})
})

describe("a shared loan reads the other Return's record", () => {
	it("refuses a record that states the other Filer's income differently", async () => {
		const home = await separate(salaries("2026-12-31", "2026-12-31"))
		const holder = {
			...record("th-2026-pit@me", "1000000.00"),
			tallies: [
				{ label: "income.section40_1@me", basis: "gross", amount: "1000000.00" },
				{ label: "income.section40_1@partner", basis: "gross", amount: "400000.00" },
			],
		}
		const res = await projection(home, [
			...RUN,
			"--carry-in",
			carryInFile(home, [holder, record("th-2026-pit@partner", "500000.00")]),
		])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "document.0.tallies" })
		expect(errorOf(res).message).toContain("400000.00")
		expect(errorOf(res).message).toContain("500000.00")
	})

	it("names the other Return's missing record, not the fill's rest", async () => {
		const home = await separate(salaries("2026-12-31", "2026-12-31"))
		const res = await projection(home, [
			...RUN,
			"--carry-in",
			carryInFile(home, [record("th-2026-pit@me", "1000000.00")]),
		])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "--carry-in" })
		expect(errorOf(res).message).toContain('The Levy "th-2026-pit@partner" needs a Carry-in record')
	})

	// The docs say such a record states this Return's 29 classes and the shared 22, and the CLI
	// fills the other Filer's 22. No "rest" is needed: the 51 classes are all it has to state.
	it("accepts a record that states all 51 classes with no rest: 77,000 and 8,500", async () => {
		const home = await separate(salaries("2026-12-31", "2026-12-31"))
		const res = await projection(home, [
			...RUN,
			"--carry-in",
			carryInFile(home, [
				fullRecord("th-2026-pit@me", "1000000.00", "0.00"),
				fullRecord("th-2026-pit@partner", "500000.00", "0.00"),
			]),
		])
		expect(res.code, res.err).toBe(0)
		expect(dues2026(runBody(res))).toEqual({ me: "77000.00", partner: "8500.00" })
	})
})
