import { duplicateOf, mergeCharts, saveChart, uniqueId } from "../lib/view/charts/edit"
import {
	CHARTS_KEY,
	parseCharts,
	readCharts,
	serializeCharts,
	UNREAD_KEY,
} from "../lib/view/charts/stored"
import type { ChartDef } from "../lib/view/charts/types"
import { readStoredResult, subscribeStorageKey, tryWriteStored } from "./browser"
import { saveFile } from "./download"

/** The most charts a person is told they have reached, in words. */
const FULL = "You have reached the most charts this browser keeps (50). Delete one first."
const KEPT_UNREAD = `The saved charts that could not be read are kept in this browser under ${UNREAD_KEY}.`

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
	/** Saved text that could not be read, held until a save would replace it. */
	private unread: string | null = null

	constructor() {
		if (typeof window === "undefined") return
		this.sync()
		this.listen()
	}

	/** Reads the saved charts again when another tab changes them. Nothing else re-reads. */
	listen(): () => void {
		return subscribeStorageKey(CHARTS_KEY, () => this.sync())
	}

	/**
	 * Reads the saved charts. A read the browser refuses leaves what is in memory alone: the charts of
	 * this visit are not lost to storage that cannot be read.
	 */
	sync(): void {
		const stored = readStoredResult(CHARTS_KEY)
		if (!stored.ok) return
		const read = readCharts(stored.value)
		this.charts = read.charts
		this.problem = read.problem
		this.unread = read.problem === null ? null : stored.value
	}

	/** Keeps the list. Text that could not be read is first put aside under `UNREAD_KEY`, never overwritten. */
	private keep(next: readonly ChartDef[]): void {
		const aside = this.unread
		this.charts = next
		this.unsaved = !tryWriteStored(CHARTS_KEY, serializeCharts(next))
		if (aside === null || this.unsaved) return
		tryWriteStored(UNREAD_KEY, aside)
		this.unread = null
		this.problem = null
		this.notice = [this.notice, KEPT_UNREAD].filter(Boolean).join(" ")
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
		this.notice = null
		this.keep(this.charts.filter((chart) => chart.id !== id))
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
