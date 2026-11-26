import { TH_LEVY_SHARED_FILER } from "@trajectonomics/core/tax/th"
import { type AppError, fail, isAppError } from "../errors"
import { type JsonRecord, records as objects } from "../scenario/tax/json"
import type { CarryInRecordForm } from "./carryin"
import { type CarryInClass, classesOf, keyOf } from "./carryin-classes"
import { type CarryInEntry, flagEntry, storedEntry } from "./carryin-entry"
import { sharedOtherOf } from "./carryin-shared"
import { storedMonthDay } from "./periods"

/** One resolved record and, when the flag stated it, the record's index in the document. */
export type Working = { entry: CarryInEntry; flag: number | null }

/** The period starts a Levy needs a record for: `starts` in engine order, and its current one. */
export type Needed = { starts: readonly string[]; current: string }

/** Where the records came from, and what the caller named, as every refusal here spells it. */
export type LevyInput = {
	currency: string
	scenario: { id: string; name: string; path: string }
}

/** The refusal for a period the same Levy already has a record for, from either source. */
function duplicated(path: string, levy: string, periodStart: string): AppError {
	return fail("invalid_input", {
		path,
		message: `The period ${periodStart} is stated twice for the Levy "${levy}"; it takes one record per period.`,
		hint: "State each period once, in the document or with --carry-in, not both.",
	})
}

/** The classes a shared-loan pair supplies from its two records: the other Filer's own and the shared income. */
function fillableClasses(levy: JsonRecord, classes: readonly CarryInClass[]): ReadonlySet<string> {
	const other = sharedOtherOf(levy)
	if (other === undefined) return new Set()
	const suffixes = [`@${other}`, `@${TH_LEVY_SHARED_FILER}`]
	return new Set(
		classes
			.filter((it) => it.basis === "gross" && suffixes.some((it2) => it.label.endsWith(it2)))
			.map(keyOf),
	)
}

/** One Levy's stored records, then the flag's, each resolved; the caller sorts them. */
export function entriesOf(
	levy: JsonRecord,
	id: string,
	selected: readonly { record: CarryInRecordForm; index: number }[],
	input: LevyInput,
): { items: Working[]; classes: CarryInClass[] } | AppError {
	const classes = classesOf(levy)
	const fillable = fillableClasses(levy, classes)
	const period = storedMonthDay(levy["period"])
	const items: Working[] = []
	const seen = new Set<string>()
	for (const stored of objects(levy["carryIn"])) {
		const entry = storedEntry({
			record: stored,
			levy: id,
			classes,
			fillable,
			path: input.scenario.path,
			period,
		})
		if (isAppError(entry)) return entry
		if (seen.has(entry.periodStart)) return duplicated(input.scenario.path, id, entry.periodStart)
		seen.add(entry.periodStart)
		items.push({ entry, flag: null })
	}
	for (const { record, index } of selected) {
		const entry = flagEntry({
			record,
			index,
			levy: id,
			classes,
			fillable,
			currency: input.currency,
			period,
		})
		if (isAppError(entry)) return entry
		if (seen.has(entry.periodStart)) {
			return duplicated(`document.${index}.periodStart`, id, entry.periodStart)
		}
		seen.add(entry.periodStart)
		items.push({ entry, flag: index })
	}
	return { items, classes }
}
