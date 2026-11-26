import { TH_LEVY_SHARED_FILER } from "@trajectonomics/core/tax/th"
import { type AppError, isAppError } from "../errors"
import { filerOfTaxLevy } from "../scenario/tax"
import type { JsonRecord } from "../scenario/tax/json"
import { type CarryInClass, classesOf, keyOf, type StatedTally } from "./carryin-classes"
import type { CarryInEntry } from "./carryin-entry"
import type { ResolvedLevy } from "./carryin-resolve"
import { filledShared, filledTally, sourceAmount, sourceEntryOf } from "./carryin-shared-fill"
import type { FillWhere } from "./carryin-shared-refuse"

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

/** The shared income classes both records of a shared-loan pair state, which the fill reconciles. */
export function sharedClasses(classes: readonly CarryInClass[]): CarryInClass[] {
	const suffix = `@${TH_LEVY_SHARED_FILER}`
	return classes.filter((it) => it.basis === "gross" && it.label.endsWith(suffix))
}

/** One tally of a shared-loan record: the other Filer's income, the shared income, or untouched. */
function filledOf(input: {
	entry: CarryInEntry
	tally: StatedTally
	key: string
	others: ReadonlySet<string>
	shared: ReadonlySet<string>
	source: CarryInEntry | undefined
	sourceLevy: ResolvedLevy | undefined
	where: FillWhere
}): StatedTally | AppError {
	const from = sourceAmount(input.sourceLevy, input.entry.periodStart, input.key)
	if (input.shared.has(input.key)) {
		return filledShared({
			entry: input.entry,
			source: input.source,
			tally: input.tally,
			from,
			where: input.where,
		})
	}
	if (!input.others.has(input.key)) return input.tally
	return filledTally({
		tally: input.tally,
		stated: input.entry.stated.has(input.key),
		from,
		where: input.where,
	})
}

/** One record with the other Filer's income and the shared income read from the other record. */
export function fillOne(input: {
	entry: CarryInEntry
	other: string
	classes: readonly CarryInClass[]
	source: ResolvedLevy | undefined
	where: FillWhere
}): CarryInEntry | AppError {
	const others = new Set(otherClasses(input.classes, input.other).map(keyOf))
	const shared = new Set(sharedClasses(input.classes).map(keyOf))
	if (others.size === 0 && shared.size === 0) return input.entry
	const source = sourceEntryOf(input.source, input.entry.periodStart)
	const tallies: StatedTally[] = []
	for (const tally of input.entry.tallies) {
		const filled = filledOf({
			entry: input.entry,
			tally,
			key: keyOf(tally),
			others,
			shared,
			source,
			sourceLevy: input.source,
			where: input.where,
		})
		if (isAppError(filled)) return filled
		tallies.push(filled)
	}
	return { ...input.entry, tallies }
}
