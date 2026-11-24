/**
 * The three routing lists of a plan's `cashflow` as the page reads them (sim ADR 0030, cli ADR 0070): the surplus steps, the
 * `contribute` priority and the `withdraw` entries. An entry of `withdraw` is an Account's id or `{ account, downTo }`, so a
 * reader that wants the Account asks `entryAccount`, never the entry itself. Object editing only: no figure is made here.
 */
import type { ScenarioCashflow, ScenarioDocument } from "../../contract"

export type Step = NonNullable<ScenarioCashflow["surplus"]>[number]
export type Entry = NonNullable<ScenarioCashflow["withdraw"]>[number]
/** A target as the document states it: a decimal string, or `{ amount, growth }` that keeps its value in today's money. */
export type Target = NonNullable<Step["upTo"]>

/** The routing list names, in the order the page shows them. */
export const LISTS = ["surplus", "contribute", "withdraw"] as const
export type ListName = (typeof LISTS)[number]

/** The Account an entry of `withdraw` draws on. */
export function entryAccount(entry: Entry): string {
	return typeof entry === "string" ? entry : entry.account
}

/** The Account ids of a plan's `withdraw` list in order, an Account once for each entry that names it. */
export function withdrawAccounts(doc: ScenarioDocument): string[] {
	return (doc.cashflow?.withdraw ?? []).map(entryAccount)
}

/** The surplus steps of a plan, in order. */
export function stepsOf(doc: ScenarioDocument): readonly Step[] {
	return doc.cashflow?.surplus ?? []
}

/** The document with one routing list replaced; its other keys, and the other lists, are kept as they are. */
export function withList<K extends ListName>(
	doc: ScenarioDocument,
	list: K,
	items: NonNullable<ScenarioCashflow[K]>,
): ScenarioDocument {
	return { ...doc, cashflow: { ...doc.cashflow, [list]: items } }
}

/** Whether a target keeps its value in today's money. */
export function isReal(target: Target | undefined): boolean {
	return typeof target === "object" && target.growth === "inflation"
}

/** The decimal amount of a target, as the document writes it. */
export function amountOf(target: Target): string {
	return typeof target === "string" ? target : target.amount
}
