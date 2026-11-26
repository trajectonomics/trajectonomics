import { type AppError, isAppError } from "../errors"
import { filerOfTaxLevy } from "../scenario/tax"
import type { Working } from "./carryin-levy"
import type { ResolvedLevy } from "./carryin-resolve"
import { fillOne, sharedOtherOf } from "./carryin-shared"

/** The Levy of each single Filer, so a shared loan can find the other Return's record. */
function leviesByFiler(levies: readonly ResolvedLevy[]): Map<string, ResolvedLevy> {
	const byFiler = new Map<string, ResolvedLevy>()
	for (const one of levies) {
		const filer = filerOfTaxLevy(one.id)
		if (filer !== undefined) byFiler.set(filer, one)
	}
	return byFiler
}

/** One Levy's records, each with a shared loan's other-Filer income filled in. */
function filledItems(input: {
	one: ResolvedLevy
	source: ResolvedLevy | undefined
	other: string
	path: string
	currency: string
}): Working[] | AppError {
	const items: Working[] = []
	for (const item of input.one.items) {
		const path = item.flag === null ? input.path : `document.${item.flag}.tallies`
		const entry = fillOne({
			entry: item.entry,
			other: input.other,
			classes: input.one.classes,
			source: input.source,
			where: {
				path,
				currency: input.currency,
				levy: input.one.id,
				other: input.other,
				periodStart: item.entry.periodStart,
			},
		})
		if (isAppError(entry)) return entry
		items.push({ ...item, entry })
	}
	return items
}

/** Fills each shared-loan Levy's other-Filer classes from the other Return's own record. */
export function fillSharedLevies(input: {
	levies: readonly ResolvedLevy[]
	path: string
	currency: string
}): ResolvedLevy[] | AppError {
	const byFiler = leviesByFiler(input.levies)
	const filled: ResolvedLevy[] = []
	for (const one of input.levies) {
		const other = sharedOtherOf(one.levy)
		if (other === undefined) {
			filled.push(one)
			continue
		}
		const items = filledItems({
			one,
			source: byFiler.get(other),
			other,
			path: input.path,
			currency: input.currency,
		})
		if (isAppError(items)) return items
		filled.push({ ...one, items })
	}
	return filled
}
