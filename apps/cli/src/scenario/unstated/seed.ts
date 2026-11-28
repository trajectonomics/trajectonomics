import { isPlainObject } from "../../json"
import { formatPath } from "../path"
import type { UnstatedEntry } from "./entry"

/** The string id of an account or flow, or null when the item carries none. */
function idOf(item: unknown): string | null {
	if (!isPlainObject(item)) return null
	const id = item["id"]
	return typeof id === "string" && id !== "" ? id : null
}

function itemsOf(value: unknown): readonly unknown[] {
	return Array.isArray(value) ? value : []
}

/**
 * The paths `scenario apply <name> --template --as-of` seeds (cli ADR-0084): inflation, every
 * Account's rate (assets and liabilities) and every Flow's amount, all from the template. The column
 * sorts them; the display order puts inflation first, then the Accounts, then the Flows.
 */
export function templateUnstated(document: unknown): UnstatedEntry[] {
	if (!isPlainObject(document)) return []
	const entries: UnstatedEntry[] = []
	if (isPlainObject(document["economy"])) {
		entries.push({ path: formatPath(["economy", "inflation"]), source: "template" })
	}
	for (const account of itemsOf(document["accounts"])) {
		const id = idOf(account)
		if (id !== null)
			entries.push({ path: formatPath(["accounts", id, "rate"]), source: "template" })
	}
	for (const flow of itemsOf(document["flows"])) {
		const id = idOf(flow)
		if (id !== null) entries.push({ path: formatPath(["flows", id, "amount"]), source: "template" })
	}
	return entries
}
