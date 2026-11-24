/**
 * The assets "I own it already" can attach to: an asset the Baseline holds a balance in, which the plan
 * declares or only the ledger knows. The balance is the Baseline's own text (web ADR 0002), and the Account the
 * asset attaches to is the one the Baseline names, so its value opens at that balance (cli ADR 0060).
 */
import type { Baseline, Read, ScenarioDocument } from "../../contract"
import { withdrawAccounts } from "../routing/entries"
import { isRealAsset } from "./asset-parts"
import type { Choice } from "./options"

/** One asset the Baseline holds: the id the Scenario spells it by, its ledger name and the Baseline's balance. */
export interface OwnedChoice {
	readonly id: string
	readonly name: string
	readonly balance: string
}

/** The strings of a list, or none when the value is not a list. */
function stringsOf(value: unknown): string[] {
	return Array.isArray(value)
		? value.filter((item): item is string => typeof item === "string")
		: []
}

/** The Account ids the plan's cash-flow routing names: `withdraw`, the accounts of `surplus`, and `contribute`. */
function routedIds(doc: ScenarioDocument): ReadonlySet<string> {
	const cashflow = doc["cashflow"]
	if (typeof cashflow !== "object" || cashflow === null) return new Set()
	const lists: Record<string, unknown> = { ...cashflow }
	const steps: unknown[] = Array.isArray(lists["surplus"]) ? lists["surplus"] : []
	const surplus = steps.map((step) => (step as { account?: unknown } | null)?.account)
	return new Set([
		...withdrawAccounts(doc),
		...stringsOf(lists["contribute"]),
		...stringsOf(surplus),
	])
}

/**
 * The assets of the Baseline a real asset may attach to, in the Baseline's order. An asset the plan already
 * keeps as a real asset is left out, except `keep`, the Account of the asset being edited. Empty when the
 * Baseline was not read or holds no asset.
 */
function candidatesOf(
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

/**
 * The assets "I own it already" can attach to. An asset a routing list names (`cashflow.withdraw`, `surplus` or
 * `contribute`) is left out, except `keep`: it is not liquid once it is a real asset, and `traj` refuses to route
 * money through one (`ILLIQUID_ROUTED`).
 */
export function ownedChoicesOf(
	doc: ScenarioDocument,
	baseline: Read<Baseline> | undefined,
	keep?: string,
): OwnedChoice[] {
	const routed = routedIds(doc)
	return candidatesOf(doc, baseline, keep).filter(
		(choice) => choice.id === keep || !routed.has(choice.id),
	)
}

/** The names of the Baseline's assets left out of the choices because a routing list names them. */
export function routedChoicesOf(
	doc: ScenarioDocument,
	baseline: Read<Baseline> | undefined,
	keep?: string,
): string[] {
	const routed = routedIds(doc)
	return candidatesOf(doc, baseline, keep)
		.filter((choice) => choice.id !== keep && routed.has(choice.id))
		.map((choice) => choice.name)
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
export function ownedUnavailable(
	choices: readonly OwnedChoice[],
	routed: readonly string[] = [],
): string | null {
	if (choices.length > 0) return null
	if (routed.length === 0) return "The Baseline holds no asset that is not already kept here."
	return `${routed.join(", ")} pays for shortfalls in this plan (the cash-flow routing names it), and a home or car cannot do that.`
}
