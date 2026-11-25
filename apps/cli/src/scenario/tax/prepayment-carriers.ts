import type { ScenarioDocument } from "../document"
import { isRecord, type JsonRecord } from "./json"

/** The change one record that states Prepayments takes; `item` is the path an Owner names it by. */
export type CarrierChange = (carrier: JsonRecord, item: string) => JsonRecord

/** An Account with its payout changed, when it has one. */
function accountWith(account: JsonRecord, change: CarrierChange): JsonRecord {
	const payout = account["payout"]
	if (!isRecord(payout)) return account
	return { ...account, payout: change(payout, `accounts.${String(account["id"])}`) }
}

/**
 * The document with each record that states Prepayments rewritten by `change`: every Flow, and every
 * asset Account's payout, which the engine pays as an income Flow of that Account.
 */
export function withCarriers(document: ScenarioDocument, change: CarrierChange): ScenarioDocument {
	const next: ScenarioDocument = { ...document }
	if (Array.isArray(document["flows"])) {
		next["flows"] = document["flows"].map((flow) =>
			isRecord(flow) ? change(flow, `flows.${String(flow["id"])}`) : flow,
		)
	}
	if (Array.isArray(document["accounts"])) {
		next["accounts"] = document["accounts"].map((account) =>
			isRecord(account) ? accountWith(account, change) : account,
		)
	}
	return next
}
