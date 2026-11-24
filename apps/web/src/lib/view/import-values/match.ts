import type { ValueSheet } from "../record-values/types"
import type { ImportSource } from "./types"

/** The choice that leaves a column out of the import. */
export const SKIP = "skip"

/** Each source's choice by its key: an account id, `SKIP`, or no entry while it is still to decide. */
export type Matches = Readonly<Record<string, string>>

/** An account a column can be matched to: an open asset or liability Leaf Account of the ledger. */
export interface Target {
	readonly id: string
	readonly name: string
	readonly group: string
	readonly owed: boolean
}

/** The accounts the dropdown offers, in the sheet's own order and groups. */
export function targetsOf(sheet: ValueSheet): Target[] {
	return sheet.groups.flatMap((group) =>
		group.rows.map((row) => ({ id: row.id, name: row.name, group: group.title, owed: row.owed })),
	)
}

/**
 * Matches each source to the account whose exact name or id it states. A name that two accounts share is
 * left to the person, as is every column that names nothing.
 */
export function autoMatches(sources: readonly ImportSource[], targets: readonly Target[]): Matches {
	const matched: Record<string, string> = {}
	for (const source of sources) {
		const hits = targets.filter(
			(target) => target.id === source.label || target.name === source.label,
		)
		const only = hits.length === 1 ? hits[0] : undefined
		if (only !== undefined) matched[source.key] = only.id
	}
	return matched
}

/** The choices a person already made, kept for the sources that are still in the table, over the automatic ones. */
export function keepChoices(
	prior: Matches,
	sources: readonly ImportSource[],
	targets: readonly Target[],
): Matches {
	const kept: Record<string, string> = { ...autoMatches(sources, targets) }
	for (const source of sources) {
		const choice = prior[source.key]
		if (
			choice !== undefined &&
			(choice === SKIP || targets.some((target) => target.id === choice))
		) {
			kept[source.key] = choice
		}
	}
	return kept
}

/** Whether a source has been matched or skipped. */
export function decided(matches: Matches, source: ImportSource): boolean {
	return matches[source.key] !== undefined
}

/** The sources matched to an account (not skipped), which are the ones the import sends. */
export function matchedSources(sources: readonly ImportSource[], matches: Matches): ImportSource[] {
	return sources.filter((source) => decided(matches, source) && matches[source.key] !== SKIP)
}

/** Whether Next is allowed: every column matched or skipped, and at least one matched to send. */
export function matchComplete(sources: readonly ImportSource[], matches: Matches): boolean {
	return (
		sources.every((source) => decided(matches, source)) &&
		matchedSources(sources, matches).length > 0
	)
}

/** The choices with one source's choice set, or cleared when it is empty. */
export function withChoice(matches: Matches, key: string, choice: string): Matches {
	const others = Object.entries(matches).filter(([other]) => other !== key)
	return Object.fromEntries(choice === "" ? others : [...others, [key, choice]])
}
