import { TH_LEVY_SHARED_FILER } from "@trajectonomics/core/tax/th"
import { type AppError, isAppError } from "../errors"
import { filerOfTaxLevy } from "../scenario/tax"
import type { JsonRecord } from "../scenario/tax/json"
import { type CarryInClass, classesOf, keyOf, type StatedTally } from "./carryin-classes"
import type { CarryInEntry } from "./carryin-entry"
import type { ResolvedLevy } from "./carryin-resolve"
import { type FillWhere, refusedDifferent, refusedNoRecord } from "./carryin-shared-refuse"

/**
 * The other Filer whose income a separate Levy reads, or undefined when it shares no loan. The
 * stored Levy does not keep the profile's `sharedMortgage`: the emitted Measures read the labels,
 * so the other Filer is the one suffix besides this Filer and `@shared` that they tally.
 */
export function sharedOtherOf(levy: JsonRecord): string | undefined {
	const id = levy["id"]
	const own = typeof id === "string" ? filerOfTaxLevy(id) : undefined
	if (own === undefined) return undefined
	const suffixes = new Set(
		classesOf(levy)
			.filter((it) => it.basis === "gross")
			.map((it) => it.label.slice(it.label.lastIndexOf("@") + 1)),
	)
	suffixes.delete(own)
	suffixes.delete(TH_LEVY_SHARED_FILER)
	const [other] = [...suffixes]
	return other
}

/** The income classes this Levy reads from the other Filer's own Return record. */
function otherClasses(classes: readonly CarryInClass[], other: string): CarryInClass[] {
	const suffix = `@${other}`
	return classes.filter((it) => it.basis === "gross" && it.label.endsWith(suffix))
}

/** The other record's amount for a class, zero when it has no record and owes none, else undefined. */
function sourceAmount(
	source: ResolvedLevy | undefined,
	periodStart: string,
	key: string,
): number | undefined {
	const item = source?.items.find((it) => it.entry.periodStart === periodStart)
	if (item !== undefined) return item.entry.tallies.find((it) => keyOf(it) === key)?.amount
	const needed = source?.needed
	if (needed === null || needed === undefined) return undefined
	if (periodStart === needed.current && needed.starts.includes(needed.current)) return undefined
	return 0
}

/** One other-Filer class: the other record's amount, or the refusal that says why there is none. */
function filledTally(input: {
	tally: StatedTally
	stated: boolean
	from: number | undefined
	where: FillWhere
}): StatedTally | AppError {
	if (input.from === undefined) {
		return input.stated ? input.tally : refusedNoRecord(input.where, input.tally)
	}
	if (input.stated && input.tally.amount !== input.from) {
		return refusedDifferent(input.where, input.tally, input.from)
	}
	return { ...input.tally, amount: input.from }
}

/** One record with the other Filer's income read from that Return's record, or the refusal. */
export function fillOne(input: {
	entry: CarryInEntry
	other: string
	classes: readonly CarryInClass[]
	source: ResolvedLevy | undefined
	where: FillWhere
}): CarryInEntry | AppError {
	const keys = new Set(otherClasses(input.classes, input.other).map(keyOf))
	if (keys.size === 0) return input.entry
	const tallies: StatedTally[] = []
	for (const tally of input.entry.tallies) {
		const key = keyOf(tally)
		if (!keys.has(key)) {
			tallies.push(tally)
			continue
		}
		const filled = filledTally({
			tally,
			stated: input.entry.stated.has(key),
			from: sourceAmount(input.source, input.entry.periodStart, key),
			where: input.where,
		})
		if (isAppError(filled)) return filled
		tallies.push(filled)
	}
	return { ...input.entry, tallies }
}
