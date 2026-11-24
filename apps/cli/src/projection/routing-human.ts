import { formatPercent } from "../scenario/percent"
import { isRecord, tableLines } from "../table/lines"

/*
 * The human view of the `routing` echo (cli ADR-0070): one table of the entries, each by its position, read from
 * the echo the JSON states, so the text names no figure the echo does not carry.
 */

const COLUMNS = [
	{ key: "list", label: "list" },
	{ key: "entry", label: "entry", align: "right" },
	{ key: "account", label: "account" },
	{ key: "share", label: "share", align: "right" },
	{ key: "target", label: "target" },
] as const

/** A target as a person reads it: `up to 200000.00 (in today's money, grown by inflation)`. */
function targetText(prefix: string, value: unknown): string {
	if (!isRecord(value)) return ""
	const growth = value["growth"]
	const amount = `${prefix} ${String(value["amount"])}`
	if (growth === null || growth === undefined) return amount
	const by = isRecord(growth) ? `${String(growth["bps"])} bps a year` : String(growth)
	return `${amount} (grown by ${by})`
}

function rowsOf(list: string, entries: unknown, key: "upTo" | "downTo", prefix: string) {
	if (!Array.isArray(entries)) return []
	return entries.filter(isRecord).map((entry) => ({
		list,
		entry: entry["entry"],
		account: entry["account"],
		share: typeof entry["share"] === "number" ? `${formatPercent(entry["share"])}%` : "",
		target: targetText(prefix, entry[key]),
	}))
}

/** The routing table, printed after the body when the result states a `routing` echo. */
export function routingBlocks(data: Record<string, unknown>): string[] {
	const routing = data["routing"]
	if (!isRecord(routing)) return []
	const rows = [
		...rowsOf("surplus", routing["surplus"], "upTo", "up to"),
		...rowsOf("withdraw", routing["withdraw"], "downTo", "down to"),
	]
	return rows.length === 0 ? [] : [tableLines("routing", rows.length, rows, COLUMNS)]
}
