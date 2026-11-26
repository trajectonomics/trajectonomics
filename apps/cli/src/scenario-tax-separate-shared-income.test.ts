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
 * Both records of a shared-loan pair are one view of the same period's shared income, so they must
 * agree on the `@shared` classes: a stated class fills a record that leaves it out, and two
 * different claims are refused (cli ADR-0075, trajectonomics#619).
 */

describe("the shared income both records state", () => {
	// The partner stopped in 2025, and its record states 100,000 of shared 2026 income while the
	// holder's record rests it. Before the pair was compared, the partner claimed its 30,000 share
	// and the holder claimed the whole 60,000: 90,000 on a 60,000 loan. A rest zero is a claim, so
	// the records disagree and are refused.
	it("refuses a rest that disagrees with the other record", async () => {
		const home = await separate(salaries("2026-12-31", "2025-12-31", "2025-01-01"))
		const partner = {
			...record("th-2026-pit@partner", "0.00"),
			tallies: [
				{ label: "income.section40_1@partner", basis: "gross", amount: "0.00" },
				{ label: "income.section40_1@shared", basis: "gross", amount: "100000.00" },
			],
		}
		const res = await projection(home, [
			...RUN,
			"--carry-in",
			carryInFile(home, [record("th-2026-pit@me", "1000000.00"), partner]),
		])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "document.0.tallies" })
		expect(errorOf(res).message).toContain("income.section40_1@shared")
		expect(errorOf(res).message).toContain("100000.00")
	})

	/*
	 * Both records state the shared salary of 100,000, so each Return sees the same two incomes:
	 * the holder's 1,000,000 + 50,000 = 1,050,000 and the partner's 50,000.
	 * Holder: expenses min(50%, 100,000) = 100,000; allowances 60,000 + 30,000 (both earn) = 90,000;
	 *   taxable 860,000; tax 7,500 + 20,000 + 37,500 + 20% x 110,000 = 87,000.
	 * Partner: expenses 25,000; allowances 60,000 + 30,000 = 90,000; taxable 0, tax 0.
	 */
	it("gives the holder 90,000 of allowances and 87,000 of tax", async () => {
		const home = await separate(salaries("2026-12-31", "2025-12-31", "2025-01-01"))
		const holder = {
			...record("th-2026-pit@me", "1000000.00"),
			tallies: [
				{ label: "income.section40_1@me", basis: "gross", amount: "1000000.00" },
				{ label: "income.section40_1@shared", basis: "gross", amount: "100000.00" },
			],
		}
		const partner = {
			...record("th-2026-pit@partner", "0.00"),
			tallies: [
				{ label: "income.section40_1@partner", basis: "gross", amount: "0.00" },
				{ label: "income.section40_1@shared", basis: "gross", amount: "100000.00" },
			],
		}
		const res = await projection(home, [...RUN, "--carry-in", carryInFile(home, [holder, partner])])
		expect(res.code, res.err).toBe(0)
		const rows = runBody(res).taxYears.filter((it) => it.from === "2026-01-01")
		expect(rows.map((it) => [it.filer, it.due, it.walk?.allowances])).toEqual([
			["me", "87000.00", "90000.00"],
			["partner", "0.00", "90000.00"],
		])
	})

	// The holder's record states only its own 29 classes, so the shared 22 come from the partner's
	// record: the holder's income is 1,050,000 and the same 87,000 tax as the consistent case.
	it("fills a shared class that only one record states", async () => {
		const home = await separate(salaries("2026-12-31", "2025-12-31", "2025-01-01"))
		const res = await projection(home, [
			...RUN,
			"--carry-in",
			carryInFile(home, [
				fullRecord("th-2026-pit@me", "1000000.00"),
				fullRecord("th-2026-pit@partner", "0.00", "100000.00"),
			]),
		])
		expect(res.code, res.err).toBe(0)
		expect(dues2026(runBody(res))).toEqual({ me: "87000.00", partner: "0.00" })
	})
})
