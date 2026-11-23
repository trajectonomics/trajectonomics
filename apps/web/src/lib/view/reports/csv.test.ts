import { describe, expect, test } from "bun:test"
import { BYTE_ORDER_MARK, csvField, csvText, tableCsv } from "./csv"
import { parseCsv } from "./csv-parse.test-support"
import type { ReportTable } from "./table"

describe("csvField", () => {
	test("leaves a plain cell as it is", () => {
		expect(csvField("-94000.00")).toBe("-94000.00")
		expect(csvField("2026-10-31")).toBe("2026-10-31")
	})

	test("quotes a cell that holds a comma, a quote or a line break, doubling each quote", () => {
		expect(csvField("a,b")).toBe('"a,b"')
		expect(csvField('say "hi"')).toBe('"say ""hi"""')
		expect(csvField("line one\nline two")).toBe('"line one\nline two"')
		expect(csvField("carriage\rreturn")).toBe('"carriage\rreturn"')
	})

	test("quotes a cell that starts or ends in a space, so a spreadsheet keeps it, and round-trips it", () => {
		expect(csvField(" leading")).toBe('" leading"')
		expect(csvField("trailing ")).toBe('"trailing "')
		expect(csvField("inner space")).toBe("inner space")
		const text = csvText(["name"], [{ name: " ธนาคาร " }, { name: "a  " }])
		expect(parseCsv(text)).toEqual([["name"], [" ธนาคาร "], ["a  "]])
	})

	test("does not quote Thai text, which has no comma, quote or line break", () => {
		expect(csvField("เงินสด")).toBe("เงินสด")
	})
})

describe("csvText", () => {
	test("starts with a byte-order mark, then a header of field names and one row per record, in CRLF", () => {
		const text = csvText(["date", "amount"], [{ date: "2026-10-31", amount: "100.50" }])
		expect(text.startsWith(BYTE_ORDER_MARK)).toBe(true)
		expect(text).toBe(`${BYTE_ORDER_MARK}date,amount\r\n2026-10-31,100.50\r\n`)
	})

	test("writes the columns in the order given, not the order the record holds them", () => {
		const text = csvText(["b", "a"], [{ a: "1", b: "2" }])
		expect(parseCsv(text)).toEqual([
			["b", "a"],
			["2", "1"],
		])
	})

	test("round-trips Thai names, commas, quotes and line breaks cell for cell", () => {
		const records = [
			{ account: 'ธนาคารกสิกร, บัญชี "ออม"', amount: "-1234.50" },
			{ account: "เงินสด\nสำรอง", amount: "0.00" },
		]
		expect(parseCsv(csvText(["account", "amount"], records))).toEqual([
			["account", "amount"],
			['ธนาคารกสิกร, บัญชี "ออม"', "-1234.50"],
			["เงินสด\nสำรอง", "0.00"],
		])
	})
})

describe("tableCsv", () => {
	const table: ReportTable = {
		name: "balances",
		label: "Account balances",
		columns: [
			{ key: "date", numeric: false },
			{ key: "account", numeric: false },
			{ key: "amount", numeric: true },
		],
		records: [{ date: "2026-10-31", account: "เงินฝาก", amount: "5000.00" }],
	}

	test("leaves a hidden column out of the header and out of every row", () => {
		expect(parseCsv(tableCsv(table, ["account"]))).toEqual([
			["date", "amount"],
			["2026-10-31", "5000.00"],
		])
	})

	test("writes every column when none is hidden", () => {
		expect(parseCsv(tableCsv(table, []))[0]).toEqual(["date", "account", "amount"])
	})
})
