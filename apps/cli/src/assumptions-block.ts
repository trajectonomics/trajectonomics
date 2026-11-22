import { ASSUMPTIONS_KEY, type AssumptionView } from "./tax-assumptions"

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isAssumption(value: unknown): value is AssumptionView {
	return isRecord(value) && typeof value["path"] === "string" && typeof value["note"] === "string"
}

/** Every assumption array at the places a result carries one: the result, its tax years, its sides. */
function listsOf(data: Record<string, unknown>): unknown[] {
	const sides = isRecord(data["sides"]) ? Object.values(data["sides"]) : []
	const years = [data, ...sides].flatMap((holder) => {
		const rows = isRecord(holder) ? holder["taxYears"] : undefined
		return Array.isArray(rows) ? rows : []
	})
	return [
		data[ASSUMPTIONS_KEY],
		...years.map((year) => (isRecord(year) ? year[ASSUMPTIONS_KEY] : [])),
	]
}

function lineOf(it: AssumptionView): string {
	const value = Array.isArray(it.value) ? `[${it.value.join(", ")}]` : String(it.value)
	return `- ${it.path} = ${value} (${it.status}): ${it.note}`
}

/** The assumptions in the arrays, each path once, in the order first met. */
function uniqueAssumptions(lists: readonly unknown[]): AssumptionView[] {
	const seen = new Map<string, AssumptionView>()
	for (const it of lists.flatMap((list) => (Array.isArray(list) ? list : []))) {
		if (isAssumption(it) && !seen.has(it.path)) seen.set(it.path, it)
	}
	return [...seen.values()]
}

/**
 * The human Format's "Assumptions" block: one line per figure, each once even when several tax
 * years use it, or no lines when the result names none. JSON carries the same figures per year.
 */
export function assumptionLines(data: unknown): string[] {
	const found = isRecord(data) ? uniqueAssumptions(listsOf(data)) : []
	if (found.length === 0) return []
	return ["Assumptions (tax figures used whose source is not yet confirmed):", ...found.map(lineOf)]
}
