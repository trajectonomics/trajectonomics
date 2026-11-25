import type { ScenarioDocument } from "../document"
import type { FilerScope } from "./filer-scope"
import { isRecord, type JsonRecord, records } from "./json"
import { isTaxLevyId, TAX_LEVY_ID, taxLevyIdFor } from "./levy-ids"

/*
 * Prepayments name the Levy they credit (cli ADR-0075). A separate Return writes one Levy per
 * person, so each Prepayment moves to its Flow's Owner's Levy, and a `shared` Flow's is split half
 * to each. Turning the suffix back into the bare id first makes every write idempotent.
 */

/** One Prepayment entry, its Levy taken back to `th-2026-pit` when it names a Levy this build wrote. */
function merged(list: readonly JsonRecord[]): JsonRecord[] {
	const root: JsonRecord = { ...list.find((it) => isTaxLevyId(it["levy"])) }
	let total = 0
	const kept: JsonRecord[] = []
	for (const entry of list) {
		if (isTaxLevyId(entry["levy"])) total += Number(entry["bps"] ?? 0)
		else kept.push(entry)
	}
	return total === 0 && root["bps"] === undefined
		? kept
		: [...kept, { ...root, levy: TAX_LEVY_ID, bps: total }]
}

/** One flow's Prepayments and capped Prepayment with every CLI Levy id taken back to the bare one. */
function joined(flow: JsonRecord): JsonRecord {
	const prepayments = records(flow["prepayments"])
	const capped = flow["cappedPrepayment"]
	const next: JsonRecord = { ...flow }
	if (prepayments.some((it) => isTaxLevyId(it["levy"]))) {
		next["prepayments"] = merged(prepayments)
	}
	if (isRecord(capped) && isTaxLevyId(capped["levy"])) {
		next["cappedPrepayment"] = { ...capped, levy: TAX_LEVY_ID }
	}
	return next
}

/** One entry pointed at a Levy, or the two halves when `shared`. */
function pointed(entry: JsonRecord, owner: string, filers: readonly string[]): JsonRecord[] {
	if (owner !== "shared") return [{ ...entry, levy: taxLevyIdFor(owner) }]
	const [first, second] = filers
	if (first === undefined) return []
	if (second === undefined) return [{ ...entry, levy: taxLevyIdFor(first) }]
	const bps = Number(entry["bps"] ?? 0)
	const half = Math.floor(bps / 2)
	const halves = [
		{ ...entry, levy: taxLevyIdFor(first), bps: half + (bps - half * 2) },
		{ ...entry, levy: taxLevyIdFor(second), bps: half },
	]
	return halves.filter((it) => it["bps"] !== 0)
}

/** One flow with its Prepayments pointed at the Levy of its Owner, when the Return files separately. */
function pointedFlow(flow: JsonRecord, scope: FilerScope): JsonRecord {
	if (scope.kind !== "separate") return flow
	const owner = scope.ownerOf.get(`flows.${String(flow["id"])}`)
	if (owner === undefined) return flow
	const prepayments = records(flow["prepayments"]).flatMap((it) => pointed(it, owner, scope.filers))
	const capped = flow["cappedPrepayment"]
	const next: JsonRecord = { ...flow }
	if (prepayments.length > 0) next["prepayments"] = prepayments
	if (isRecord(capped)) {
		const [only] = pointed({ ...capped, bps: capped["bps"] }, owner, scope.filers)
		if (only !== undefined) next["cappedPrepayment"] = only
	}
	return next
}

/** Every Flow's Prepayments taken back to the bare Levy id, so a write can point them again. */
export function joinedPrepayments(document: ScenarioDocument): ScenarioDocument {
	if (!Array.isArray(document["flows"])) return document
	return {
		...document,
		flows: document["flows"].map((flow) => (isRecord(flow) ? joined(flow) : flow)),
	}
}

/** Every Flow's Prepayments pointed at the Levy of its Owner for a separate Return, or left alone. */
export function pointedPrepayments(
	document: ScenarioDocument,
	scope: FilerScope | null,
): ScenarioDocument {
	if (scope === null || !Array.isArray(document["flows"])) return document
	return {
		...document,
		flows: document["flows"].map((flow) => (isRecord(flow) ? pointedFlow(flow, scope) : flow)),
	}
}
