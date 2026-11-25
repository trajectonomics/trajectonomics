import type { ScenarioDocument } from "../document"
import { isRecord, type JsonRecord, records } from "./json"
import { isTaxLevyId, TAX_LEVY_ID } from "./levy-ids"
import { withCarriers } from "./prepayment-carriers"

/**
 * The entries with every tax Levy's share summed into one on `th-2026-pit`, where the first of them
 * stood. Another Levy's entry keeps its place, so a plan without Filers keeps its order and bytes.
 */
function merged(list: readonly JsonRecord[]): JsonRecord[] {
	const taxed = list.filter((entry) => isTaxLevyId(entry["levy"]))
	const [first] = taxed
	const bps = taxed.reduce((sum, entry) => sum + Number(entry["bps"] ?? 0), 0)
	return list.flatMap((entry) => {
		if (entry === first) return [{ ...entry, levy: TAX_LEVY_ID, bps }]
		return isTaxLevyId(entry["levy"]) ? [] : [entry]
	})
}

/** One carrier's Prepayments and capped Prepayment with every tax Levy id taken back to the bare one. */
function joined(carrier: JsonRecord): JsonRecord {
	const prepayments = records(carrier["prepayments"])
	const capped = carrier["cappedPrepayment"]
	const next: JsonRecord = { ...carrier }
	if (prepayments.some((entry) => isTaxLevyId(entry["levy"]))) {
		next["prepayments"] = merged(prepayments)
	}
	if (isRecord(capped) && isTaxLevyId(capped["levy"])) {
		next["cappedPrepayment"] = { ...capped, levy: TAX_LEVY_ID }
	}
	return next
}

/** Every Prepayment of a tax Levy taken back to the bare id, so a write can point it again. */
export function joinedPrepayments(document: ScenarioDocument): ScenarioDocument {
	return withCarriers(document, joined)
}
