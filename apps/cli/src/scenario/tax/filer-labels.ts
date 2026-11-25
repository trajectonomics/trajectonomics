import type { ScenarioDocument } from "../document"
import { isRecord, type JsonRecord, records } from "./json"
import { TAX_CONTRIBUTION_LABELS, TAX_INCOME_LABELS } from "./labels"

/*
 * The Tally labels a document states, and the Filer suffix a Levy with Filers reads them under
 * (cli ADR-0075, tax ADR-0009). A caller states the bare label; the CLI writes the suffix from the
 * household's Owners, and takes it off again before it reads a label back.
 */

/** The labels `@trajectonomics/core/tax` reads, bare. */
const KNOWN: ReadonlySet<string> = new Set([...TAX_INCOME_LABELS, ...TAX_CONTRIBUTION_LABELS])

/** One tax label a Flow or an Account states: the item that states it, and the label. */
export type LabelSlot = { item: string; label: string }

/** A label without the `@<filer>` suffix, or the label itself when its base is no label tax reads. */
export function bareLabelOf(label: string): string {
	const at = label.lastIndexOf("@")
	if (at <= 0) return label
	const base = label.slice(0, at)
	return KNOWN.has(base) ? base : label
}

/** Whether a label is one tax reads, with or without a Filer suffix. */
function isTaxLabel(label: unknown): label is string {
	return typeof label === "string" && KNOWN.has(bareLabelOf(label))
}

/** A Flow's label is tallied for tax only on an income or a contribution Flow. */
function flowSlot(flow: JsonRecord): LabelSlot[] {
	const taxed = flow["kind"] === "income" || flow["kind"] === "contribution"
	const label = flow["label"]
	return taxed && isTaxLabel(label) ? [{ item: `flows.${String(flow["id"])}`, label }] : []
}

/** The three labels an asset Account can state: its return, its gain and its payout's. */
function accountSlots(account: JsonRecord): LabelSlot[] {
	if (account["kind"] !== "asset") return []
	const item = `accounts.${String(account["id"])}`
	const payout = account["payout"]
	const labels = [
		account["returnLabel"],
		account["gainLabel"],
		isRecord(payout) ? payout["label"] : undefined,
	]
	return labels.filter(isTaxLabel).map((label) => ({ item, label }))
}

/** Every tax label the document's Flows and Accounts state, each with the item that states it. */
export function taxSlots(document: ScenarioDocument): LabelSlot[] {
	return [
		...records(document["flows"]).flatMap(flowSlot),
		...records(document["accounts"]).flatMap(accountSlots),
	]
}

/** An Account with each tax label it states rewritten with `change`. */
function accountWith(account: JsonRecord, change: (slot: LabelSlot) => string): JsonRecord {
	if (account["kind"] !== "asset") return account
	const at = (label: string): string => change({ item: `accounts.${String(account["id"])}`, label })
	const next: JsonRecord = { ...account }
	for (const field of ["returnLabel", "gainLabel"]) {
		if (isTaxLabel(next[field])) next[field] = at(next[field])
	}
	const payout = next["payout"]
	if (isRecord(payout) && isTaxLabel(payout["label"])) {
		next["payout"] = { ...payout, label: at(payout["label"]) }
	}
	return next
}

/** A Flow with its tax label rewritten with `change`. */
function flowWith(flow: JsonRecord, change: (slot: LabelSlot) => string): JsonRecord {
	const [slot] = flowSlot(flow)
	return slot === undefined ? flow : { ...flow, label: change(slot) }
}

/** The document with every tax label of its Flows and Accounts rewritten by `change`. */
export function relabelled(
	document: ScenarioDocument,
	change: (slot: LabelSlot) => string,
): ScenarioDocument {
	const next: ScenarioDocument = { ...document }
	if (Array.isArray(document["flows"])) {
		next["flows"] = document["flows"].map((flow) =>
			isRecord(flow) ? flowWith(flow, change) : flow,
		)
	}
	if (Array.isArray(document["accounts"])) {
		next["accounts"] = document["accounts"].map((account) =>
			isRecord(account) ? accountWith(account, change) : account,
		)
	}
	return next
}

/** The document with every Filer suffix taken off its tax labels, so each reads as the caller states it. */
export function withoutFilerLabels(document: ScenarioDocument): ScenarioDocument {
	if (taxSlots(document).every((slot) => bareLabelOf(slot.label) === slot.label)) return document
	return relabelled(document, (slot) => bareLabelOf(slot.label))
}
