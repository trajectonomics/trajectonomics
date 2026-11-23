import { describe, expect, it } from "bun:test"
import { projection } from "./projection/testing"
import {
	FLAGS,
	firstYearOf,
	HAND_YEAR,
	identityHolds,
	yearLines,
} from "./projection-breakdown-hand"
import { breakdownHome } from "./projection-breakdown-support"
import { runBody, tableOf } from "./projection-run-support"
import { capture } from "./test-support"

/*
 * `projection run --breakdown` beside the other flags (cli ADR-0058): one combination of each, and the
 * schema that names the table. Each combination still holds the identity of sim ADR-0018.
 */

describe("projection run --breakdown: combined with the other flags", () => {
	it("--monthly keeps the cash flow beside the monthly rows", async () => {
		const home = await breakdownHome()
		const body = runBody(await projection(home, ["run", ...FLAGS, "--monthly", "--breakdown"]))
		expect(body.tables.map((table) => table.name)).toEqual(["annual", "monthly", "cashflow"])
		expect(yearLines(tableOf(body, "cashflow").rows)).toHaveLength(HAND_YEAR.length)
	})

	it("--set moves the Contribution, so its unfunded part goes with it", async () => {
		const home = await breakdownHome()
		const lines = await firstYearOf(home, ["--set", "flows.extra.amount=0"])
		expect(lines.some((line) => line.group === "unfunded")).toBe(false)
		expect(lines.some((line) => line.id === "extra")).toBe(false)
		expect(identityHolds(lines, 0)).toBe(true)
	})

	it("--without takes a Flow's lines out, and the identity still holds", async () => {
		const home = await breakdownHome()
		const lines = await firstYearOf(home, ["--without", "flows.invest"])
		expect(lines.some((line) => line.id === "invest")).toBe(false)
		expect(identityHolds(lines, 0)).toBe(true)
	})

	it("--decimal reads a money Set as a decimal, and the lines state it", async () => {
		const home = await breakdownHome()
		const lines = await firstYearOf(home, ["--decimal", "--set", 'flows.car.amount="2000.00"'])
		expect(lines.find((line) => line.id === "car")?.amount).toBe("2000.00")
		expect(lines.find((line) => line.group === "drawn")?.amount).toBe("2000.00")
		expect(identityHolds(lines, 0)).toBe(true)
	})

	it("--carry-in moves only the settlement, by the tax the carry-in had already prepaid", async () => {
		const home = await breakdownHome()
		const record = {
			scenario: "breakdown-bare",
			levy: "national",
			periodStart: "2026-01-01",
			tallies: [{ label: "salary", basis: "gross", amount: "0.00" }],
			prepaid: "1000.00",
		}
		const res = await capture(
			[
				"projection",
				"run",
				"--scenario",
				"breakdown-bare",
				"--as-of",
				"2026-03-31",
				"--horizon",
				"2027-03-30",
				"--carry-in",
				"-",
				"--breakdown",
				"--json",
			],
			{ TRAJ_HOME: home },
			undefined,
			JSON.stringify([record]),
		)
		expect(res.code).toBe(0)
		const lines = yearLines(tableOf(runBody(res), "cashflow").rows)
		expect(lines.find((line) => line.group === "settlement")?.amount).toBe("-2800.00")
		expect(lines.find((line) => line.group === "prepaid")?.amount).toBe("6000.00")
	})
})

describe("projection run --breakdown: the schema names the new output", () => {
	it("describes the flag and the cash-flow table", async () => {
		const res = await capture(["schema", "projection", "run", "--json"])
		expect(res.code).toBe(0)
		const schema = JSON.parse(res.out) as {
			input: { properties: { breakdown: { description: string } } }
		}
		expect(schema.input.properties.breakdown.description).toContain("cash flow")
		expect(res.out).toContain('"cashflow"')
	})
})
