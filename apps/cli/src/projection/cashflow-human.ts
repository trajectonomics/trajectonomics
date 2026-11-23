import { parseMinorUnits } from "../store/money"
import type { ColumnHint } from "../table/lines"
import { isRecord, tableLines } from "../table/lines"
import { moneyOf } from "./money"

/*
 * `projection run --breakdown`'s human view (cli ADR-0058). The long table is for JSON; a person
 * reads one short block per Annual roll-up after the body. A total the engine gives as a field is
 * printed as that field: `income`, `expense`, `contributions` and `unfundedContributions` come from
 * the annual row. A total the engine gives no field for is the exact integer sum of the engine's own
 * lines (`money in`, `tax`, `withdrawals`, `drawn` and `left over`), so the CLI adds nothing the
 * engine did not route.
 */

const BLOCK_COLUMNS: readonly ColumnHint[] = [
	{ key: "line", label: "line" },
	{ key: "amount", label: "amount", align: "right" },
]

/** One printed row of a block: a section total, or a line under it. */
type BlockRow = { line: string; amount: string }

/** A named table's rows of the result, or nothing when the result has no such table. */
export function tableRows(
	data: Record<string, unknown>,
	name: string,
): Record<string, unknown>[] | undefined {
	const tables = data["tables"]
	if (!Array.isArray(tables)) return undefined
	const table = tables.find((entry) => isRecord(entry) && entry["name"] === name)
	if (!isRecord(table) || !Array.isArray(table["rows"])) return undefined
	return table["rows"].filter(isRecord)
}

/** The result without its cash-flow table: the long table is for JSON, and the blocks print instead. */
export function cashflowHidden(data: Record<string, unknown>): Record<string, unknown> {
	const tables = data["tables"]
	if (!Array.isArray(tables)) return data
	return {
		...data,
		tables: tables.filter((entry) => !(isRecord(entry) && entry["name"] === "cashflow")),
	}
}

/** The minor units of an engine amount, which the result states as text at the Currency's scale. */
function minorOf(text: unknown, currency: string): number {
	const minor = typeof text === "string" ? parseMinorUnits(text, currency) : undefined
	if (typeof minor !== "number") throw new Error(`a cash-flow amount is not money: ${String(text)}`)
	return minor
}

/** The exact integer sum of some engine amounts, in minor units. */
function sumOf(amounts: readonly unknown[], currency: string): number {
	return amounts.reduce<number>((total, amount) => total + minorOf(amount, currency), 0)
}

/** The amounts of the lines in one group. */
function amountsOf(lines: readonly Record<string, unknown>[], group: string): unknown[] {
	return lines.filter((line) => line["group"] === group).map((line) => line["amount"])
}

/** One roll-up's block rows: each section's total, then the lines a person reads under it. */
function blockRows(
	annual: Record<string, unknown>,
	lines: readonly Record<string, unknown>[],
	currency: string,
): BlockRow[] {
	const money = moneyOf(currency)
	const income = minorOf(annual["income"], currency)
	const withdrawals = sumOf(amountsOf(lines, "withdrawal"), currency)
	const drawn = sumOf(amountsOf(lines, "drawn"), currency)
	const tax = sumOf([...amountsOf(lines, "prepaid"), ...amountsOf(lines, "settlement")], currency)
	const surplus = sumOf(amountsOf(lines, "surplus"), currency)
	const unfunded = minorOf(annual["unfundedContributions"], currency)
	const unmet = minorOf(annual["unmet"], currency)

	const rows: BlockRow[] = [
		{ line: "money in", amount: money(income + withdrawals + drawn) },
		{ line: "  income", amount: money(income) },
	]
	if (amountsOf(lines, "withdrawal").length > 0) {
		rows.push({ line: "  withdrawals", amount: money(withdrawals) })
	}
	if (amountsOf(lines, "drawn").length > 0) rows.push({ line: "  drawn", amount: money(drawn) })
	if (amountsOf(lines, "prepaid").length + amountsOf(lines, "settlement").length > 0) {
		rows.push({ line: "tax", amount: money(tax) })
	}
	rows.push({ line: "spending", amount: String(annual["expense"]) })
	for (const line of lines.filter((entry) => entry["group"] === "category")) {
		const name = line["id"] === null ? "(uncategorised)" : String(line["id"])
		rows.push({ line: `  ${name}`, amount: money(minorOf(line["amount"], currency)) })
	}
	rows.push({ line: "saving", amount: String(annual["contributions"]) })
	// Not indented under saving: it is what the cash could not fund, not a part of saving.
	if (unfunded !== 0) rows.push({ line: "not funded", amount: money(unfunded) })
	rows.push({ line: "left over", amount: money(surplus) })
	if (unmet !== 0) rows.push({ line: "unmet", amount: money(unmet) })
	return rows
}

/**
 * One block per Annual roll-up, printed after the body, when the result carries a cash-flow table.
 * Without `--breakdown` the result has none, and this prints nothing.
 */
export function cashflowBlocks(data: Record<string, unknown>): string[] {
	const lines = tableRows(data, "cashflow")
	const annual = tableRows(data, "annual")
	if (lines === undefined || annual === undefined) return []
	const currency = String(data["currency"])
	return annual.map((row) => {
		const rollupLines = lines.filter((line) => line["index"] === row["index"])
		const rows = blockRows(row, rollupLines, currency)
		const heading = `cash flow ${String(row["from"])} to ${String(row["to"])}`
		return tableLines(heading, rows.length, rows, BLOCK_COLUMNS)
	})
}
