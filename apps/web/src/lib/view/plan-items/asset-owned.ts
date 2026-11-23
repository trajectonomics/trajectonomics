/**
 * The assets "I own it already" can attach to: an asset the Baseline holds a balance in, which the plan
 * declares or only the ledger knows. The balance is the Baseline's own text (web ADR 0002), and the Account the
 * asset attaches to is the one the Baseline names, so its value opens at that balance (cli ADR 0060).
 */
import type { Baseline, Read, ScenarioDocument } from "../../contract"
import { isRealAsset } from "./asset-parts"
import type { Choice } from "./options"

/** One asset the Baseline holds: the id the Scenario spells it by, its ledger name and the Baseline's balance. */
export interface OwnedChoice {
	readonly id: string
	readonly name: string
	readonly balance: string
}

/**
 * The assets of the Baseline a real asset may attach to, in the Baseline's order. An asset the plan already
 * keeps as a real asset is left out, except `keep`, the Account of the asset being edited. Empty when the
 * Baseline was not read or holds no asset.
 */
export function ownedChoicesOf(
	doc: ScenarioDocument,
	baseline: Read<Baseline> | undefined,
	keep?: string,
): OwnedChoice[] {
	if (baseline === undefined || !baseline.ok) return []
	return baseline.data.rows.flatMap((row): OwnedChoice[] => {
		if (row.kind !== "asset") return []
		const declared = doc.accounts.find(
			(account) => account.id === row.account.id || account.id === row.account.name,
		)
		if (declared !== undefined && (declared.kind !== "asset" || isRealAsset(declared))) {
			return declared.id === keep
				? [{ id: declared.id, name: row.account.name, balance: row.amount }]
				: []
		}
		const id = declared?.id ?? row.account.id
		return [{ id, name: row.account.name, balance: row.amount }]
	})
}

/** The choice of the asset with that Scenario id, or undefined. */
export function ownedChoiceOf(
	choices: readonly OwnedChoice[],
	id: string,
): OwnedChoice | undefined {
	return choices.find((choice) => choice.id === id)
}

/** The select's choices: none chosen first, then each asset by its ledger name. */
export function ownedSelectChoices(choices: readonly OwnedChoice[]): readonly Choice[] {
	return [
		{ value: "", label: "Choose the asset" },
		...choices.map((choice) => ({ value: choice.id, label: choice.name })),
	]
}

/** Why "I own it already" is unavailable, or null when an asset can be chosen. */
export function ownedUnavailable(choices: readonly OwnedChoice[]): string | null {
	return choices.length > 0 ? null : "The Baseline holds no asset that is not already kept here."
}
