import { graphemes } from "../../chart/label-graphemes"
import type { AccountNames } from "../account-names"
import { seriesWords } from "./series-ids"
import { type ChartDef, type ChartKind, MAX_CHARTS, MAX_NAME } from "./types"

/** An id from a name, unique among the ones taken: "My chart", then "my-chart-2". */
export function uniqueId(name: string, taken: ReadonlySet<string>): string {
	const slug =
		name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 40) || "chart"
	let id = slug
	for (let n = 2; taken.has(id); n += 1) id = `${slug}-${n}`
	return id
}

/** A draft of a chart: what the drawer holds before it is saved. */
export interface ChartDraft {
	readonly name: string
	readonly kind: ChartKind
	readonly series: readonly string[]
}

/** The longest prefix of whole graphemes that fits `room` characters, ended with an ellipsis. */
function shortened(text: string, room: number): string {
	let kept = ""
	for (const part of graphemes(text, false)) {
		if (kept.length + part.text.length > room - 1) break
		kept += part.text
	}
	return `${kept.trimEnd()}…`
}

/** The name a chart gets when the person types none: its first series, and how many more. */
export function defaultName(seriesNames: readonly string[]): string {
	const first = seriesNames[0] ?? "My chart"
	const more = seriesNames.length - 1
	if (more <= 0) return first.length > MAX_NAME ? shortened(first, MAX_NAME) : first
	const suffix = ` and ${more} more`
	const room = MAX_NAME - suffix.length
	return `${first.length > room ? shortened(first, room) : first}${suffix}`
}

/**
 * The name a chart is saved under: the one typed, or the default from its series ids, read through a name index
 * without the plan's labels. The name is the same on every plan, so a saved chart fits all of them.
 */
export function savedName(
	typed: string,
	series: readonly string[],
	names: ReadonlyMap<string, string>,
	accounts: AccountNames = new Map(),
): string {
	const chosen = typed.trim()
	return chosen === ""
		? defaultName(series.map((id) => names.get(id) ?? seriesWords(id, accounts)))
		: chosen
}

/** Adds a chart, or replaces the one with the same id. Refused (null) when the list is full. */
export function saveChart(
	charts: readonly ChartDef[],
	chart: ChartDef,
): readonly ChartDef[] | null {
	if (charts.some((existing) => existing.id === chart.id)) {
		return charts.map((existing) => (existing.id === chart.id ? chart : existing))
	}
	return charts.length >= MAX_CHARTS ? null : [...charts, chart]
}

/** A copy of a chart under a new id and a name that says so. */
export function duplicateOf(charts: readonly ChartDef[], chart: ChartDef): ChartDef {
	const id = uniqueId(chart.name, new Set(charts.map((existing) => existing.id)))
	return { ...chart, id, name: `${chart.name} (copy)`.slice(0, MAX_NAME) }
}

/** Takes in charts from a file: each keeps its name and gets an id not yet used. Null when they would not fit. */
export function mergeCharts(
	charts: readonly ChartDef[],
	incoming: readonly ChartDef[],
): readonly ChartDef[] | null {
	if (charts.length + incoming.length > MAX_CHARTS) return null
	const taken = new Set(charts.map((chart) => chart.id))
	const added = incoming.map((chart) => {
		const id = uniqueId(chart.id, taken)
		taken.add(id)
		return { ...chart, id }
	})
	return [...charts, ...added]
}
