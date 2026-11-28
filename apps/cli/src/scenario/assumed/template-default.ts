import { isAppError } from "../../errors"
import { isPlainObject } from "../../json"
import type { ScenarioRow } from "../../store"
import type { ScenarioDocument } from "../document"
import { formatPath } from "../path"
import { quotedName } from "../quoted-name"
import { parseUnstated } from "../unstated/entry"
import { valueAt } from "../unstated/value-at"
import type { TemplateDefault } from "./shape"

function itemsOf(value: unknown): readonly unknown[] {
	return Array.isArray(value) ? value : []
}

function idOf(item: unknown): string | null {
	if (!isPlainObject(item)) return null
	const id = item["id"]
	return typeof id === "string" && id !== "" ? id : null
}

/** The display order of the paths: inflation first, then Accounts in document order, then Flows. */
function displayPaths(document: ScenarioDocument): string[] {
	const paths = [formatPath(["economy", "inflation"])]
	for (const account of itemsOf(document["accounts"])) {
		const id = idOf(account)
		if (id !== null) paths.push(formatPath(["accounts", id, "rate"]))
	}
	for (const flow of itemsOf(document["flows"])) {
		const id = idOf(flow)
		if (id !== null) paths.push(formatPath(["flows", id, "amount"]))
	}
	return paths
}

/** One stored entry as an item: its printed value, and the command with its stored minor value. */
function itemOf(
	name: string,
	path: string,
	plain: ScenarioDocument,
	printed: ScenarioDocument,
): TemplateDefault[] {
	const shown = valueAt(printed, path)
	const minor = valueAt(plain, path)
	if (!shown.found || !minor.found) return []
	const value = shown.value
	if (typeof value !== "number" && typeof value !== "string") return []
	const hint = `Run "traj scenario apply ${quotedName(name)} --set ${path}=${JSON.stringify(minor.value)}" to state it, at this value or another.`
	return [{ kind: "template-default", path, value, hint }]
}

/**
 * The values the template wrote that no edit has touched since, in display order (cli ADR-0084):
 * inflation, then every Account's rate, then every Flow's amount. The value is the printed one, so
 * under `--decimal` an amount is the decimal string while inflation and rates stay integer basis
 * points; the hint names the stored minor value. A row from before schema 6 has no entries.
 */
export function templateDefaultItems(
	row: ScenarioRow,
	plain: ScenarioDocument,
	printed: ScenarioDocument,
): TemplateDefault[] {
	const entries = parseUnstated(row.unstated)
	if (isAppError(entries) || entries.length === 0) return []
	const stored = new Set(entries.map((entry) => entry.path))
	return displayPaths(plain)
		.filter((path) => stored.has(path))
		.flatMap((path) => itemOf(row.name, path, plain, printed))
}
