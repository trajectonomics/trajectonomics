import { describe, expect, test } from "bun:test"
import { projectionRunFixture } from "../projection/fixtures.test-support"
import { reportTables } from "./tables"

describe("the estate tables of a projection run", () => {
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
		const named = (name: string) => tables.find((candidate) => candidate.name === name)
		const table = named("estate")
		if (table === undefined) throw new Error("the report holds no estate table")
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
		expect(table.records[0]?.["net"]).toBe("-200.00")
		expect(named("estateLines")?.records).toEqual([])
	})
})
