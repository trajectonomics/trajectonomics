import { describe, expect, it } from "bun:test"
import { projectionAllowances } from "./projection-allowances"

/*
 * The CLI's own `projection allowances` golden, parsed by the Dashboard's contract (cli ADR-0061). The
 * golden is the CLI's bytes, so a field the CLI adds or renames fails here before it reaches the page.
 */
const CLI_FIXTURES = new URL("../../../../cli/src/projection/fixtures/", import.meta.url)

async function golden(): Promise<unknown> {
	return JSON.parse(await Bun.file(new URL("allowances.output", CLI_FIXTURES)).text())
}

describe("the projection allowances contract against the CLI's golden", () => {
	it("parses both tables, the Flow that applies each suggestion included", async () => {
		const result = projectionAllowances.parse(await golden())
		expect(
			result.taxYears.map((year) => [year.from, year.dueBefore, year.dueAfter, year.saving]),
		).toEqual([
			["2026-01-01", "28400.00", "300.00", "28100.00"],
			["2027-01-01", "64400.00", "4300.00", "60100.00"],
		])
		const rmf = result.allowances.find(
			(row) => row.from === "2026-01-01" && row.label.endsWith("rmf"),
		)
		expect(rmf?.flow).toMatchObject({
			id: "rmf-fund-rmf-2026",
			amount: "170000.00",
			target: "rmf-fund",
		})
	})

	it("refuses a field the CLI does not state, so a rename cannot pass silently", async () => {
		const result = projectionAllowances.safeParse({ ...((await golden()) as object), extra: 1 })
		expect(result.success).toBe(false)
	})
})
