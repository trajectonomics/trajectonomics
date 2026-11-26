import { type AppError, isAppError } from "../errors"
import type { ScenarioDocument } from "../scenario/document"
import type { JsonRecord } from "../scenario/tax/json"
import type { CarryInRecordForm } from "./carryin"
import type { CarryInClass } from "./carryin-classes"
import { echoOf, replaced } from "./carryin-echo"
import type { Needed, Working } from "./carryin-levy"
import { entriesOf } from "./carryin-levy"
import { completed } from "./carryin-needed"
import type { CarryInEcho } from "./carryin-view"
import { carryInStarts, periodStartAtOrBefore, storedMonthDay } from "./periods"

/** One Levy's explicit Carry-in records, before a shared loan's other-Filer fill or scope records. */
export type ResolvedLevy = {
	readonly levy: JsonRecord
	readonly id: string
	readonly items: Working[]
	readonly classes: CarryInClass[]
	readonly needed: Needed | null
}

/** What resolving one Levy reads from the command. */
export type ResolveInput = {
	readonly document: ScenarioDocument
	readonly scenario: { id: string; name: string; path: string }
	readonly asOf: string
	readonly currency: string
}

/** The period starts a Levy needs a record for, or null when nothing here can be derived. */
function neededOf(levy: JsonRecord, asOf: string): Needed | null {
	const period = storedMonthDay(levy["period"])
	const settlement = storedMonthDay(levy["settlement"])
	if (period === undefined || settlement === undefined) return null
	return {
		starts: carryInStarts(asOf, { period, settlement }),
		current: periodStartAtOrBefore(asOf, period),
	}
}

/** One Levy's explicit records resolved, or the refusal that stopped the placement. */
export function resolvedOf(
	levy: JsonRecord,
	input: ResolveInput,
	selected: readonly { record: CarryInRecordForm; index: number }[],
): ResolvedLevy | AppError {
	const id = typeof levy["id"] === "string" ? levy["id"] : ""
	const mine = selected.filter((it) => it.record.levy === id)
	const loaded = entriesOf(levy, id, mine, input)
	if (isAppError(loaded)) return loaded
	const needed = Object.hasOwn(input.document, "calendar") ? null : neededOf(levy, input.asOf)
	return { levy, id, items: loaded.items, classes: loaded.classes, needed }
}

/** The Levy with its scope records added, or the refusal for a period only the caller can state. */
export function completedOf(resolved: ResolvedLevy): ResolvedLevy | AppError {
	const items = completed({
		items: resolved.items,
		classes: resolved.classes,
		id: resolved.id,
		needed: resolved.needed,
	})
	if (isAppError(items)) return items
	return { ...resolved, items }
}

/** One Levy with its records in period order, and the records as the result echoes them. */
export function placedOf(
	resolved: ResolvedLevy,
	currency: string,
): { levy: JsonRecord; carryIn: CarryInEcho[] } {
	const ordered = [...resolved.items].sort((a, b) =>
		a.entry.periodStart.localeCompare(b.entry.periodStart),
	)
	return {
		levy: replaced(resolved.levy, ordered),
		carryIn: ordered.map((it) => echoOf(it.entry, resolved.id, currency)),
	}
}
