import { describe, expect, it } from "bun:test"
import { isAppError } from "./errors"
import { goldenTextIn } from "./golden-test-support"
import { cashflowTotalsOf } from "./projection/cashflow-totals"
import { spanTotalsOf } from "./projection/span-totals"
import { projection } from "./projection/testing"
import { reportingHome } from "./projection-reporting-support"
import { runBody, tableOf } from "./projection-run-support"
import { capture } from "./test-support"

/*
 * The Reporting tables a run-out leaves empty, the totals parity with the Annual roll-up, and the
 * schema the six Reporting tables and `yearStart` are published in (cli ADR-0086).
 */

const GOLDENS = new URL("./projection/fixtures/", import.meta.url)

describe("a run-out states empty months and its human line", () => {
	const flags = [
		"--scenario",
		"reporting-run-out",
		"--as-of",
		"2026-01-01",
		"--horizon",
		"2027-06-30",
		"--breakdown-months",
		"2027",
	]

	it("states the empty cashflowMonths and cashflowMonthTotals tables", async () => {
		const home = await reportingHome()
		const body = runBody(await projection(home, ["run", ...flags]))
		expect(body.tables.map((table) => table.name)).toEqual([
			"annual",
			"cashflowMonths",
			"cashflowMonthTotals",
		])
		expect(tableOf(body, "cashflowMonths").rows).toEqual([])
		expect(tableOf(body, "cashflowMonthTotals").rows).toEqual([])
	})

	it("prints the run-out line instead of a month table", async () => {
		const home = await reportingHome()
		const res = await capture(["projection", "run", ...flags], { TRAJ_HOME: home })
		expect(res.code).toBe(0)
		expect(res.out).toContain(
			"no months: the money runs out on 2026-03-10, before the Reporting year asked for.",
		)
	})
})

describe("spanTotalsOf agrees with cashflowTotalsOf on the breakdown goldens", () => {
	it("computes the same nine totals for every Annual roll-up", async () => {
		const golden = JSON.parse(await goldenTextIn(GOLDENS, "run-breakdown.output")) as {
			currency: string
			tables: { name: string; rows: Record<string, unknown>[] }[]
		}
		type GoldenRollup = {
			index: number
			from: string
			to: string
			income: string
			expense: string
			contributions: string
			unfundedContributions: string
			unmet: string
		}
		const annual = (golden.tables.find((table) => table.name === "annual")?.rows ??
			[]) as GoldenRollup[]
		const cashflow = golden.tables.find((table) => table.name === "cashflow")?.rows ?? []
		for (const rollup of annual) {
			const lines = cashflow
				.filter((line) => line["index"] === rollup.index)
				.map((line) => ({
					group: String(line["group"]),
					amount: String(line["amount"]),
				}))
			const fromLines = spanTotalsOf(lines, golden.currency, rollup.to)
			const fromRollup = cashflowTotalsOf(rollup, lines, golden.currency, rollup.to)
			expect(isAppError(fromLines)).toBe(false)
			expect(isAppError(fromRollup)).toBe(false)
			expect(fromLines).toEqual(fromRollup)
		}
	})
})

describe("traj schema names the Reporting tables and the year start", () => {
	async function schemaOf(
		home: string,
		leaf: string,
	): Promise<{ text: string; required: string[] }> {
		const res = await capture(["schema", "projection", leaf, "--json"], { TRAJ_HOME: home })
		const output = (JSON.parse(res.out) as { output: { required?: string[] } }).output
		return { text: JSON.stringify(output), required: output.required ?? [] }
	}

	it("publishes the six tables and an optional yearStart, for run and path", async () => {
		const home = await reportingHome()
		for (const leaf of ["run", "path"]) {
			const schema = await schemaOf(home, leaf)
			for (const name of [
				"cashflowYears",
				"cashflowYearTotals",
				"cashflowYearTransfers",
				"cashflowMonths",
				"cashflowMonthTotals",
				"cashflowMonthTransfers",
			]) {
				expect(schema.text).toContain(name)
			}
			expect(schema.text).toContain("yearStart")
			expect(schema.required).not.toContain("yearStart")
		}
	})
})
