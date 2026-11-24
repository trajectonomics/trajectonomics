import { describe, expect, test } from "bun:test"
import { parseImport } from "./parse"

const valuesOf = (text: string, layout: Parameters<typeof parseImport>[1] = "dates-down") =>
	parseImport(text, layout).entries.map((entry) => `${entry.source}|${entry.date}|${entry.value}`)

describe("the three layouts", () => {
	test("dates down: the first column holds the dates and each other column is an account", () => {
		const parsed = parseImport(
			"Date\tBank\tFund\n2026-01-31\t1000.00\t5000\n2026-02-28\t1100.00\t",
			"dates-down",
		)
		expect(parsed.problems).toEqual([])
		expect(valuesOf("Date\tBank\tFund\n2026-01-31\t1000.00\t5000\n2026-02-28\t1100.00\t")).toEqual([
			"0:Bank|2026-01-31|1000.00",
			"1:Fund|2026-01-31|5000",
			"0:Bank|2026-02-28|1100.00",
		])
		expect(parsed.sources).toEqual([
			{ key: "0:Bank", label: "Bank", count: 2, first: "2026-01-31", last: "2026-02-28" },
			{ key: "1:Fund", label: "Fund", count: 1, first: "2026-01-31", last: "2026-01-31" },
		])
	})

	test("accounts down: the first column holds the accounts and each other column is a date", () => {
		const text = "Account,2026-01-31,2026-02-28\nBank,1000,1100\nFund,,5000"
		expect(valuesOf(text, "accounts-down")).toEqual([
			"Bank|2026-01-31|1000",
			"Bank|2026-02-28|1100",
			"Fund|2026-02-28|5000",
		])
		expect(parseImport(text, "accounts-down").problems).toEqual([])
	})

	test("one row per value: a date, an account and an amount, found by the header names or by position", () => {
		const named = "Value,Account,Date\n100,Bank,2026-01-31\n200,Fund,2026-01-31"
		expect(valuesOf(named, "per-value")).toEqual(["Bank|2026-01-31|100", "Fund|2026-01-31|200"])
		const positional = "when,what,how much\n2026-01-31,Bank,100"
		expect(valuesOf(positional, "per-value")).toEqual(["Bank|2026-01-31|100"])
	})

	test("an account's date range and count come from the values it holds, not from the table's shape", () => {
		const parsed = parseImport("Account,2026-03-31,2026-01-31\nBank,3,1", "accounts-down")
		expect(parsed.sources[0]).toMatchObject({ count: 2, first: "2026-01-31", last: "2026-03-31" })
	})
})

describe("the text", () => {
	test("is read as tabs or as commas, whichever the first line holds", () => {
		expect(valuesOf("Date,Bank\n2026-01-31,10")).toEqual(["0:Bank|2026-01-31|10"])
		expect(valuesOf("Date\tBank\n2026-01-31\t10")).toEqual(["0:Bank|2026-01-31|10"])
	})

	test("takes quoted fields, with the delimiter, a doubled quote and a line break inside", () => {
		const parsed = parseImport(
			'Date,"Bank, main","Fund ""A"""\n2026-01-31,"1,234.50","5\n000"',
			"dates-down",
		)
		expect(parsed.sources.map((source) => source.label)).toEqual(["Bank, main", 'Fund "A"'])
		expect(parsed.entries.map((entry) => entry.value)).toEqual(["1234.50", "5\n000"])
	})

	test("takes a tab-separated paste whose amounts hold commas, and Windows line ends", () => {
		expect(valuesOf("Date\tBank\r\n2026-01-31\t1,000,000.50\r\n")).toEqual([
			"0:Bank|2026-01-31|1000000.50",
		])
	})

	test("numbers rows as the spreadsheet does, counting a blank one", () => {
		const parsed = parseImport("Date,Bank\n\n2026-13-45,5", "dates-down")
		expect(parsed.problems[0]).toMatchObject({ row: 3, column: "Date" })
	})

	test("says where a quote is never closed", () => {
		const parsed = parseImport('Date,Bank\n2026-01-31,"10', "dates-down")
		expect(parsed.problems).toContainEqual({
			row: 2,
			column: null,
			message: "A quote opened here is never closed.",
		})
	})

	test("is empty text with no values and nothing to fix", () => {
		expect(parseImport("  \n", "dates-down")).toEqual({
			entries: [],
			sources: [],
			problems: [],
			notes: [],
		})
	})
})

describe("the amounts", () => {
	test("lose thousands separators and a currency symbol, and nothing else is changed", () => {
		const text = 'Date,Bank,Fund,Loan,Odd\n2026-01-31,"฿1,200,000.50",$2000,"-1,000","1,5"'
		expect(valuesOf(text)).toEqual([
			"0:Bank|2026-01-31|1200000.50",
			"1:Fund|2026-01-31|2000",
			"2:Loan|2026-01-31|-1000",
			"3:Odd|2026-01-31|1,5",
		])
	})

	test("too long for traj is a row to fix, never cut", () => {
		const parsed = parseImport(`Date,Bank\n2026-01-31,${"9".repeat(41)}`, "dates-down")
		expect(parsed.entries).toEqual([])
		expect(parsed.problems[0]).toMatchObject({ row: 2, column: "Bank" })
	})
})

describe("the dates", () => {
	test("YYYY-MM-DD, and a month name or a day over 12, are read; the values come out in date order", () => {
		const text = 'Date,Bank\n31/10/2026,3\n2026/01/31,1\n28 Feb 2026,2\n"March 31, 2026",4'
		expect(parseImport(text, "dates-down").entries.map((entry) => entry.date)).toEqual([
			"2026-01-31",
			"2026-02-28",
			"2026-03-31",
			"2026-10-31",
		])
	})

	test("an ambiguous date is a row to fix, and DD/MM/YYYY is not assumed", () => {
		const parsed = parseImport("Date,Bank\n03/04/2026,1\n2026-02-28,2", "dates-down")
		expect(parsed.entries).toHaveLength(1)
		expect(parsed.problems).toHaveLength(1)
		expect(parsed.problems[0]).toMatchObject({ row: 2, column: "Date" })
		expect(parsed.problems[0]?.message).toContain("3 april or 4 march")
	})

	test("the same day and month either way, or a date that does not exist, is judged on its own", () => {
		expect(valuesOf("Date,Bank\n05/05/2026,1")).toEqual(["0:Bank|2026-05-05|1"])
		expect(parseImport("Date,Bank\n2026-02-30,1", "dates-down").problems).toHaveLength(1)
		expect(parseImport("Date,Bank\nlast week,1", "dates-down").problems).toHaveLength(1)
	})

	test("a Buddhist-era year (2560 to 2600) is converted, and a note says so", () => {
		const parsed = parseImport("Date,Bank\n2569-01-31,1\n2026-02-28,2\n31/12/2567,3", "dates-down")
		expect(parsed.entries.map((entry) => entry.date)).toEqual([
			"2024-12-31",
			"2026-01-31",
			"2026-02-28",
		])
		expect(parsed.entries.filter((entry) => entry.converted)).toHaveLength(2)
		expect(parsed.notes).toHaveLength(1)
		expect(parsed.notes[0]).toContain("2 dates used a Buddhist-era year")
		expect(parseImport("Date,Bank\n2026-02-28,2", "dates-down").notes).toEqual([])
	})
})

describe("what is wrong with the table", () => {
	test("a first row that starts with a date is no header", () => {
		const parsed = parseImport("2026-01-31,10,20\n2026-02-28,11,21", "dates-down")
		expect(parsed.problems[0]).toMatchObject({ row: 1, column: null })
	})

	test("a bad date in the header of an accounts-down table is named by its column", () => {
		const parsed = parseImport("Account,2026-01-31,soon\nBank,1,2", "accounts-down")
		expect(parsed.problems).toHaveLength(1)
		expect(parsed.problems[0]).toMatchObject({ row: 1, column: "soon" })
	})

	test("a value under no account name, or beside no account, is a row to fix at its column", () => {
		expect(parseImport("Date,Bank,\n2026-01-31,1,2", "dates-down").problems[0]).toMatchObject({
			row: 2,
			column: "C",
		})
		expect(parseImport("Date,Account,Value\n2026-01-31,,5", "per-value").problems[0]).toMatchObject(
			{ row: 2, column: "Account" },
		)
	})

	test("a per-value table with fewer than three columns says what it needs", () => {
		expect(parseImport("Date,Value\n2026-01-31,5", "per-value").problems[0]?.message).toContain(
			"three columns",
		)
	})

	test("more text than the page reads is one problem", () => {
		const parsed = parseImport(`Date,Bank\n${"2026-01-31,1\n".repeat(100_000)}`, "dates-down")
		expect(parsed.entries).toEqual([])
		expect(parsed.problems).toHaveLength(1)
	})
})
