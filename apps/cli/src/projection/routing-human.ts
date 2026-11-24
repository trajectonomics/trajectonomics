import { isRecord, tableLines } from "../table/lines"

/*
 * The human view of the `routing` echo (cli ADR-0070): one table of the entries, each by its position, read from
 * the echo the JSON states, so the text names no figure the echo does not carry. A grown target also reads what the
 * engine says it is worth at the horizon (`resolved`); its first-day figure is the amount the line already states.
 */

const COLUMNS = [
	{ key: "list", label: "list" },
	{ key: "entry", label: "entry", align: "right" },
	{ key: "account", label: "account" },
	{ key: "share", label: "share", align: "right" },
	{ key: "target", label: "target" },
] as const

/** What the engine says a grown target is worth at the horizon: `: 20600.00 at the horizon`. */
function resolvedText(resolved: unknown): string {
	return isRecord(resolved) ? `: ${String(resolved["horizon"])} at the horizon` : ""
}

/** A target as a person reads it: `up to 20000.00 at the start, grown by inflation: 20600.00 at the horizon`. */
function targetText(prefix: string, value: unknown, resolved: unknown): string {
	if (!isRecord(value)) return ""
	const growth = value["growth"]
	const amount = `${prefix} ${String(value["amount"])}`
	if (growth === null || growth === undefined) return amount
	const by = isRecord(growth) ? `${String(growth["bps"])} bps a year` : String(growth)
	return `${amount} at the start, grown by ${by}${resolvedText(resolved)}`
}

function rowsOf(list: string, entries: unknown, key: "upTo" | "downTo", prefix: string) {
	if (!Array.isArray(entries)) return []
	return entries.filter(isRecord).map((entry) => ({
		list,
		entry: entry["entry"],
		account: entry["account"],
		share: typeof entry["share"] === "string" ? `${entry["share"]}%` : "",
		target: targetText(prefix, entry[key], entry["resolved"]),
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
