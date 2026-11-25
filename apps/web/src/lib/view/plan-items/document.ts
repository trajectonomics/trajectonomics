import type {
	Read,
	ScenarioAccount,
	ScenarioDocument,
	ScenarioFlow,
	ScenarioShow,
} from "../../contract"
import type { SnapshotState } from "../state"

/** The Read of one Scenario's document, when the Snapshot holds one for that name. */
export function documentRead(state: SnapshotState, name: string): Read<ScenarioShow> | undefined {
	return state.status === "ready" ? state.snapshot.reads.documents[name] : undefined
}

/** An item list with the item put in: replaced where its id is held, appended when it is new. */
export function upsert<T extends { id: string }>(items: readonly T[], item: T): T[] {
	return items.some((existing) => existing.id === item.id)
		? items.map((existing) => (existing.id === item.id ? item : existing))
		: [...items, item]
}

/** An item list without the item of that id. */
export function without<T extends { id: string }>(items: readonly T[], id: string): T[] {
	return items.filter((item) => item.id !== id)
}

/** The document with one Flow put in, or removed by id. Its other sections are kept as they are. */
export function withFlow(doc: ScenarioDocument, flow: ScenarioFlow): ScenarioDocument {
	return { ...doc, flows: upsert(doc.flows, flow) }
}

/** The document without the Flow of that id. */
export function withoutFlow(doc: ScenarioDocument, id: string): ScenarioDocument {
	return { ...doc, flows: without(doc.flows, id) }
}

/** The document with one Account put in, replaced where its id is held, or appended. */
export function withAccount(doc: ScenarioDocument, account: ScenarioAccount): ScenarioDocument {
	return { ...doc, accounts: upsert(doc.accounts, account) }
}

/** The document without the Account of that id. */
export function withoutAccount(doc: ScenarioDocument, id: string): ScenarioDocument {
	return { ...doc, accounts: without(doc.accounts, id) }
}

/** The ids the document already uses for its Flows, so a new id does not repeat one. */
export function flowIds(doc: ScenarioDocument): string[] {
	return doc.flows.map((flow) => flow.id)
}

/** The ids the document already uses for its Accounts. */
export function accountIds(doc: ScenarioDocument): string[] {
	return doc.accounts.map((account) => account.id)
}
