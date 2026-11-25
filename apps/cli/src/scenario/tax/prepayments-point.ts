import type { ScenarioDocument } from "../document"
import { SHARED } from "../household/model"
import type { FilerScope } from "./filer-scope"
import { isRecord, type JsonRecord, records } from "./json"
import { isTaxLevyId, taxLevyIdFor } from "./levy-ids"
import { withCarriers } from "./prepayment-carriers"

/*
 * Prepayments name the Levy they credit (cli ADR-0075). A separate Return writes one Levy per
 * person, so each Prepayment of a tax Levy moves to its Owner's Levy. Another Levy's stays.
 */

/**
 * One plain entry on its Owner's Levy. A `shared` one is split half to each Filer, the odd basis
 * point to the holder's, so the two halves always add up to what was stated.
 */
function shares(entry: JsonRecord, owner: string, filers: readonly string[]): JsonRecord[] {
	const [holder = owner, partner] = owner === SHARED ? filers : [owner]
	const whole = { ...entry, levy: taxLevyIdFor(holder) }
	if (partner === undefined) return [whole]
	const bps = Number(entry["bps"] ?? 0)
	const half = Math.floor(bps / 2)
	const first = { ...whole, bps: bps - half }
	return half === 0 ? [first] : [first, { ...entry, levy: taxLevyIdFor(partner), bps: half }]
}

/**
 * A capped Prepayment on its Owner's Levy. A record states one, so a `shared` one cannot be split and
 * stays whole on the holder's Levy.
 */
function pointedCapped(capped: JsonRecord, owner: string, filers: readonly string[]): JsonRecord {
	const [holder = owner] = owner === SHARED ? filers : [owner]
	return { ...capped, levy: taxLevyIdFor(holder) }
}

/** One carrier with its tax Prepayments pointed at the Levy of its Owner. */
function pointed(carrier: JsonRecord, owner: string, filers: readonly string[]): JsonRecord {
	const prepayments = records(carrier["prepayments"])
	const capped = carrier["cappedPrepayment"]
	const next: JsonRecord = { ...carrier }
	if (prepayments.some((entry) => isTaxLevyId(entry["levy"]))) {
		next["prepayments"] = prepayments.flatMap((entry) =>
			isTaxLevyId(entry["levy"]) ? shares(entry, owner, filers) : [entry],
		)
	}
	if (isRecord(capped) && isTaxLevyId(capped["levy"])) {
		next["cappedPrepayment"] = pointedCapped(capped, owner, filers)
	}
	return next
}

/** Every tax Prepayment pointed at the Levy of its Owner for a separate Return, or left alone. */
export function pointedPrepayments(
	document: ScenarioDocument,
	scope: FilerScope | null,
): ScenarioDocument {
	if (scope?.kind !== "separate") return document
	return withCarriers(document, (carrier, item) => {
		const owner = scope.ownerOf.get(item)
		return owner === undefined ? carrier : pointed(carrier, owner, scope.filers)
	})
}
