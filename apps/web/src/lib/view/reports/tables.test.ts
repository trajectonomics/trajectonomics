import { describe, expect, test } from "bun:test"
import {
	ANNUAL_ROWS,
	projectionRunFixture,
	withMonthlyTable,
} from "../projection/fixtures.test-support"
import { tableCsv } from "./csv"
import { parseCsv } from "./csv-parse.test-support"
import type { ReportRecord, ReportTable } from "./table"
import { reportTables } from "./tables"

/** One field of a record, by its name. */
function cell(record: ReportRecord | undefined, key: string): string | undefined {
	return record?.[key]
}

function tableNamed(tables: readonly ReportTable[], name: string): ReportTable {
	const table = tables.find((candidate) => candidate.name === name)
	if (table === undefined) throw new Error(`the report holds a ${name} table`)
	return table
}

describe("reportTables", () => {
	test("the yearly rows hold every row as the CLI stated it, cell for cell", () => {
		const table = tableNamed(reportTables(projectionRunFixture()), "annual")
		expect(table.label).toBe("Yearly rows")
		expect(table.records.length).toBe(ANNUAL_ROWS.length)
		ANNUAL_ROWS.forEach((row, index) => {
			const record = table.records[index]
			expect(cell(record, "openingNetWorth")).toBe(row.openingNetWorth)
			expect(cell(record, "closingNetWorth")).toBe(row.closingNetWorth)
			expect(record?.["realNetWorth.amount"]).toBe(row.realNetWorth.amount)
			expect(record?.["realNetWorth.date"]).toBe(row.realNetWorth.date)
			expect(cell(record, "partial")).toBe(String(row.partial))
			expect(cell(record, "index")).toBe(String(row.index))
		})
	})

	test("each household person gets an age field, and a row with no such person leaves it empty", () => {
		const [first, second] = ANNUAL_ROWS
		if (first === undefined || second === undefined) throw new Error("the fixture has two rows")
		const run = projectionRunFixture({
			tables: [
				{
					name: "annual",
					count: 2,
					rows: [
						{
							...first,
							ages: [
								{ person: "ศศิ", age: 40 },
								{ person: "Pim", age: 38 },
							],
						},
						{ ...second, ages: [{ person: "ศศิ", age: 41 }] },
					],
				},
			],
		})
		const table = tableNamed(reportTables(run), "annual")
		expect(
			table.columns.map((column) => column.key).filter((key) => key.startsWith("ages.")),
		).toEqual(["ages.ศศิ", "ages.Pim"])
		expect(table.records[0]?.["ages.ศศิ"]).toBe("40")
		expect(table.records[0]?.["ages.Pim"]).toBe("38")
		expect(table.records[1]?.["ages.Pim"]).toBe("")
	})

	test("the withdrawals field is a column only when a row carries it", () => {
		const without = tableNamed(reportTables(projectionRunFixture()), "annual")
		expect(without.columns.map((column) => column.key)).not.toContain("withdrawals")
		const [first] = ANNUAL_ROWS
		if (first === undefined) throw new Error("the fixture has a first row")
		const withIt = projectionRunFixture({
			tables: [{ name: "annual", count: 1, rows: [{ ...first, withdrawals: "1200.00" }] }],
		})
		expect(cell(tableNamed(reportTables(withIt), "annual").records[0], "withdrawals")).toBe(
			"1200.00",
		)
	})

	test("the spending rules are a table of the CLI's strings, the rate a figure column only when stated", () => {
		const rows = [
			{
				flow: "spend",
				date: "2045-01-01",
				portfolio: "250000.00",
				amount: "10000.00",
				paid: "10000.00",
				withdrawalRate: "4.00",
				action: "none" as const,
			},
			{
				flow: "spend",
				date: "2046-01-01",
				portfolio: "0.00",
				amount: "10300.00",
				paid: "0.00",
				action: "cut" as const,
			},
		]
		const run = projectionRunFixture({ tables: [{ name: "spendingRules", count: 2, rows }] })
		const table = tableNamed(reportTables(run), "spendingRules")
		const rate = table.columns.find((column) => column.key === "withdrawalRate")
		expect(rate?.numeric).toBe(true)
		expect(
			table.records.map((record) => [cell(record, "withdrawalRate"), cell(record, "action")]),
		).toEqual([
			["4.00", "none"],
			["", "cut"],
		])
		const plain = projectionRunFixture({
			tables: [{ name: "spendingRules", count: 1, rows: [rows[1]!] }],
		})
		expect(
			tableNamed(reportTables(plain), "spendingRules").columns.map((column) => column.key),
		).not.toContain("withdrawalRate")
	})

	test("the estate and its lines are tables of the CLI's strings, a negative net kept as stated", () => {
		const estate = {
			date: "2045-01-01",
			gross: "100.00",
			debts: "300.00",
			costs: "0.00",
			net: "-200.00",
			gifts: "0.00",
			toHeirs: "0.00",
			realNet: "-150.00",
			realToHeirs: "0.00",
		}
		const run = projectionRunFixture({
			tables: [
				{ name: "estate", count: 1, rows: [estate] },
				{ name: "estateLines", count: 0, rows: [] },
			],
		})
		const tables = reportTables(run)
		const table = tableNamed(tables, "estate")
		expect(table.columns.map((column) => column.key)).toEqual([
			"date",
			"gross",
			"debts",
			"costs",
			"net",
			"gifts",
			"toHeirs",
			"realNet",
			"realToHeirs",
		])
		expect(cell(table.records[0]!, "net")).toBe("-200.00")
		expect(tableNamed(tables, "estateLines").records).toEqual([])
	})

	test("the monthly rows appear only when the run holds them, after the yearly rows", () => {
		const tables = reportTables(withMonthlyTable(projectionRunFixture()))
		expect(tables.map((table) => table.name)).toEqual(["annual", "monthly"])
		expect(projectionRunFixture().tables.some((table) => table.name === "monthly")).toBe(false)
	})

	test("the tax years are a table of their own, with the optional figures only when present", () => {
		const year = {
			levy: "income",
			from: "2026-01-01",
			to: "2026-12-31",
			settlementDate: "2027-03-31",
			due: "1000.00",
			prepaid: "400.00",
			owed: "600.00",
			settled: false,
			partial: false,
			assumptions: [],
		}
		const tables = reportTables(projectionRunFixture({ taxYears: [year] }))
		const taxYears = tableNamed(tables, "taxYears")
		expect(taxYears.columns.map((column) => column.key)).not.toContain("taxableIncome")
		expect(cell(taxYears.records[0], "owed")).toBe("600.00")
		expect(cell(taxYears.records[0], "settled")).toBe("false")
	})

	test("a balance with Thai account names round-trips through the CSV cell for cell", () => {
		const balances: ReportTable = tableNamed(
			reportTables(
				projectionRunFixture({
					tables: [
						{
							name: "balances",
							count: 2,
							rows: [
								{
									date: "2026-10-31",
									account: 'ธนาคารกสิกร, "ออม"',
									amount: "-94000.00",
									real: "-90000.00",
								},
								{ date: "2026-10-31", account: "เงินสด", amount: "1500.00", real: "1500.00" },
							],
						},
					],
				}),
			),
			"balances",
		)
		expect(parseCsv(tableCsv(balances, []))).toEqual([
			["date", "account", "amount", "real"],
			["2026-10-31", 'ธนาคารกสิกร, "ออม"', "-94000.00", "-90000.00"],
			["2026-10-31", "เงินสด", "1500.00", "1500.00"],
		])
	})
})
