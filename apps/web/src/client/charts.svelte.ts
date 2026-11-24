import { duplicateOf, mergeCharts, saveChart, uniqueId } from "../lib/view/charts/edit"
import { CHARTS_KEY, parseCharts, readCharts, serializeCharts } from "../lib/view/charts/stored"
import type { ChartDef } from "../lib/view/charts/types"
import { readStored, subscribeExternal, tryWriteStored } from "./browser"
import { saveFile } from "./download"

/** The most charts a person is told they have reached, in words. */
const FULL = "You have reached the most charts this browser keeps (50). Delete one first."

/**
 * The charts a person made, kept in this browser (`localStorage`), never in a plan or the ledger. Every
 * read and write is guarded: with storage unavailable the charts last for this page only, and the page
 * says so. A file that is not a chart file is refused whole.
 */
class ChartStore {
	charts = $state<readonly ChartDef[]>([])
	/** Why the saved charts could not be read, or null. */
	problem = $state<string | null>(null)
	/** True when the browser refused the last write: the charts then last for this page only. */
	unsaved = $state(false)
	/** What the last import or save said, for a status line. */
	notice = $state<string | null>(null)

	constructor() {
		if (typeof window === "undefined") return
		this.sync()
		subscribeExternal(() => this.sync())
	}

	/** Reads the saved charts again, such as after another tab changed them. */
	sync(): void {
		const read = readCharts(readStored(CHARTS_KEY))
		this.charts = read.charts
		this.problem = read.problem
	}

	private keep(next: readonly ChartDef[]): void {
		this.charts = next
		this.unsaved = !tryWriteStored(CHARTS_KEY, serializeCharts(next))
	}

	/** The id a new chart of this name would get. */
	idFor(name: string): string {
		return uniqueId(name, new Set(this.charts.map((chart) => chart.id)))
	}

	/** Adds or replaces a chart. Returns false, with a notice, when the list is full. */
	save(chart: ChartDef): boolean {
		const next = saveChart(this.charts, chart)
		this.notice = next === null ? FULL : null
		if (next !== null) this.keep(next)
		return next !== null
	}

	/** Copies a chart and returns the copy's id, or null. */
	duplicate(id: string): string | null {
		const chart = this.charts.find((candidate) => candidate.id === id)
		if (!chart) return null
		const copy = duplicateOf(this.charts, chart)
		return this.save(copy) ? copy.id : null
	}

	remove(id: string): void {
		this.keep(this.charts.filter((chart) => chart.id !== id))
		this.notice = null
	}

	/** Takes in the charts of a file. A file that is not a chart file changes nothing. */
	async importFile(file: File): Promise<void> {
		const parsed = parseCharts(await file.text())
		if (!parsed.ok) {
			this.notice = parsed.reason
			return
		}
		const merged = mergeCharts(this.charts, parsed.charts)
		this.notice =
			merged === null
				? FULL
				: `Imported ${parsed.charts.length} chart${parsed.charts.length === 1 ? "" : "s"}.`
		if (merged !== null) this.keep(merged)
	}

	/** Downloads the charts as a small JSON file. */
	exportFile(): void {
		saveFile({
			name: "trajectonomics-charts.json",
			type: "application/json",
			text: serializeCharts(this.charts),
		})
	}
}

/** The one set of charts on the page. */
export const chartStore = new ChartStore()
