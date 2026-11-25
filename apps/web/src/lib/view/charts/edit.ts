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

/** The name a chart gets when the person types none: its first series, and how many more. */
export function defaultName(seriesNames: readonly string[]): string {
	const first = seriesNames[0] ?? "My chart"
	const more = seriesNames.length - 1
	return (more > 0 ? `${first} and ${more} more` : first).slice(0, MAX_NAME)
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
