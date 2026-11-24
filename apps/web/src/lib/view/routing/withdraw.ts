/**
 * One entry of "When money is short" as the drawer states it (sim ADR 0030): an Account, and optionally a floor to keep in it
 * while the entries after it are used first. Setting a floor adds the Account's later "rest of" entry, so the money under the
 * floor is still reachable when everything else is gone; a person who does not want it removes that row.
 */
import type { Problems } from "../plan-items/problems"
import { type Entry, entryAccount } from "./entries"
import {
	NO_TARGET,
	type TargetDraft,
	targetDraftOf,
	targetFromDraft,
	targetProblems,
} from "./targets"

export interface EntryDraft extends TargetDraft {
	account: string
	/** Whether the Account keeps a floor. */
	floor: boolean
}

/** The draft of a stored entry, or a blank one with no floor. */
export function entryDraftOf(entry?: Entry): EntryDraft {
	const floored = typeof entry === "object"
	return {
		...(floored ? targetDraftOf(entry.downTo) : NO_TARGET),
		account: entry === undefined ? "" : entryAccount(entry),
		floor: floored,
	}
}

export type EntryResult = { ok: true; entry: Entry } | { ok: false; problems: Problems }

/** The entry a draft names over the stored one (a floored entry keeps any other key it holds). */
export function entryFromDraft(draft: EntryDraft, old?: Entry): EntryResult {
	if (draft.account === "") return { ok: false, problems: { account: "Choose an account." } }
	if (!draft.floor) return { ok: true, entry: draft.account }
	const downTo = targetFromDraft(draft, typeof old === "object" ? old.downTo : undefined)
	if (downTo === null) return { ok: false, problems: targetProblems(draft) }
	const kept = typeof old === "object" ? old : {}
	return { ok: true, entry: { ...kept, account: draft.account, downTo } }
}

/** Whether a later entry of the list draws on the Account with no floor, the "rest of" entry. */
function hasRestAfter(list: readonly Entry[], index: number, account: string): boolean {
	return list.slice(index + 1).some((one) => one === account)
}

/**
 * The list with `entry` put in: replacing the one at `index`, or added at the end. An entry with a floor adds the
 * Account's plain entry at the end when no later entry already draws it without a floor.
 */
export function withEntry(list: readonly Entry[], index: number | null, entry: Entry): Entry[] {
	const next =
		index === null ? [...list, entry] : list.map((one, at) => (at === index ? entry : one))
	const at = index ?? next.length - 1
	if (typeof entry === "string" || hasRestAfter(next, at, entry.account)) return next
	return [...next, entry.account]
}

/** The floored entries whose Account has no later plain entry: their money under the floor is out of reach. */
export function strandedFloors(list: readonly Entry[]): number[] {
	return list.flatMap((entry, index) =>
		typeof entry === "object" && !hasRestAfter(list, index, entry.account) ? [index] : [],
	)
}
